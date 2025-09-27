const { v4: uuidv4 } = require("uuid");
const EventEmitter = require("events");
const chalk = require("chalk");
const zmq = require("zeromq");

class AtomRequest extends EventEmitter {
  constructor() {
    super();
    this.requestHandlers = new Map(); // operation -> handler function
    this.defaultTimeout = 10000; // 10 seconds
    this.maxPendingRequests = 1000;
    this.activeRequestSockets = new Map(); // targetService -> REQ socket
    this.repSocket = null; // REP socket for handling incoming requests
    this.repSocketAddress = null;

    // Cleanup old sockets periodically
    this.cleanupInterval = setInterval(() => {
      this._cleanupIdleSockets();
    }, 60000); // Every minute
  }

  /**
   * Send a request and wait for response using ZeroMQ REQ/REP
   * @param {string} targetService - Service name (e.g., "@myapp/user-service")
   * @param {string} operation - Operation name (e.g., "get-user")
   * @param {Object} data - Request data
   * @param {Object} options - Options { timeout }
   * @returns {Promise} - Resolves with response or rejects with error
   */
  async send(targetService, operation, data = {}, options = {}) {
    if (!global._interface) {
      throw new Error(
        "AtomRequest: No active atom interface found. Ensure service is initialized.",
      );
    }

    const timeout = options.timeout || this.defaultTimeout;
    const correlationId = uuidv4();

    // Find target service info from nucleus
    const targetInterface = await this._findServiceInterface(targetService);
    if (!targetInterface) {
      throw new Error(`AtomRequest: Service '${targetService}' not found`);
    }

    // Calculate target REP port (service port + 2)
    const targetPort = parseInt(targetInterface.port) + 2;
    const targetAddress = `tcp://${targetInterface.host}:${targetPort}`;

    const requestMessage = {
      type: "request",
      correlationId,
      operation,
      data,
      timestamp: Date.now(),
      sender: global._interface.name,
    };

    return new Promise(async (resolve, reject) => {
      let reqSocket = null;
      let timeoutHandle = null;

      try {
        // Create REQ socket for this request
        reqSocket = zmq.socket("req");

        // Set up timeout
        timeoutHandle = setTimeout(() => {
          if (reqSocket) {
            reqSocket.close();
          }
          reject(
            new Error(
              `AtomRequest: Request timeout after ${timeout}ms for ${targetService}::${operation}`,
            ),
          );
        }, timeout);

        // Handle response
        reqSocket.once("message", (responseBuffer) => {
          clearTimeout(timeoutHandle);

          try {
            const response = JSON.parse(responseBuffer.toString());

            if (response.correlationId !== correlationId) {
              reject(new Error("AtomRequest: Correlation ID mismatch"));
              return;
            }

            if (response.error) {
              reject(
                new Error(
                  `AtomRequest: ${response.error} (${response.code || "UNKNOWN_ERROR"})`,
                ),
              );
            } else {
              resolve(response.result);
            }
          } catch (parseError) {
            reject(
              new Error(
                `AtomRequest: Invalid response format - ${parseError.message}`,
              ),
            );
          } finally {
            reqSocket.close();
          }
        });

        reqSocket.on("error", (error) => {
          clearTimeout(timeoutHandle);
          reject(new Error(`AtomRequest: Socket error - ${error.message}`));
        });

        // Connect and send request
        reqSocket.connect(targetAddress);
        reqSocket.send(JSON.stringify(requestMessage));

        console.debug(
          chalk.blue(
            `AtomRequest: Sent REQ ${correlationId} to ${targetService}::${operation} at ${targetAddress}`,
          ),
        );
      } catch (error) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (reqSocket) reqSocket.close();
        reject(
          new Error(`AtomRequest: Failed to send request - ${error.message}`),
        );
      }
    });
  }

  /**
   * Register a request handler
   * @param {string} operation - Operation name
   * @param {function} handler - Handler function (data, context) => result
   */
  handle(operation, handler) {
    if (typeof operation !== "string") {
      throw new Error("AtomRequest: Operation must be a string");
    }

    if (typeof handler !== "function") {
      throw new Error("AtomRequest: Handler must be a function");
    }

    this.requestHandlers.set(operation, handler);
    console.debug(
      chalk.green(
        `AtomRequest: Registered handler for operation '${operation}'`,
      ),
    );
  }

  /**
   * Remove a request handler
   * @param {string} operation - Operation name
   */
  unhandle(operation) {
    const removed = this.requestHandlers.delete(operation);
    if (removed) {
      console.debug(
        chalk.yellow(
          `AtomRequest: Unregistered handler for operation '${operation}'`,
        ),
      );
    }
  }

  /**
   * Setup REP socket for handling incoming requests
   * @param {Object} atomInterface - Atom interface instance
   */
  setupInterface(atomInterface) {
    if (!atomInterface) {
      throw new Error("AtomRequest: Interface is required");
    }

    // Calculate REP socket port (interface port + 2)
    const repPort = atomInterface.config.port + 2;
    const repHost = atomInterface.config.host || "127.0.0.1";
    this.repSocketAddress = `tcp://${repHost}:${repPort}`;

    try {
      // Create REP socket
      this.repSocket = zmq.socket("rep");

      // Handle incoming requests
      this.repSocket.on("message", async (requestBuffer) => {
        try {
          const request = JSON.parse(requestBuffer.toString());
          await this._handleRequest(request);
        } catch (error) {
          console.error(
            chalk.red(`AtomRequest: Error parsing request - ${error.message}`),
          );
          // Send error response
          const errorResponse = {
            type: "response",
            correlationId: "unknown",
            error: "Invalid request format",
            code: "PARSE_ERROR",
          };
          this.repSocket.send(JSON.stringify(errorResponse));
        }
      });

      this.repSocket.on("error", (error) => {
        console.error(
          chalk.red(`AtomRequest: REP socket error - ${error.message}`),
        );
      });

      // Bind REP socket
      this.repSocket.bindSync(this.repSocketAddress);
      console.debug(
        chalk.green(
          `AtomRequest: REP socket listening on ${this.repSocketAddress}`,
        ),
      );
    } catch (error) {
      console.error(
        chalk.red(`AtomRequest: Failed to setup REP socket - ${error.message}`),
      );
      throw error;
    }
  }

  /**
   * Handle incoming request on REP socket
   * @private
   */
  async _handleRequest(request) {
    const { correlationId, operation, data, sender } = request;

    if (!correlationId || !operation || !sender) {
      const errorResponse = {
        type: "response",
        correlationId: correlationId || "unknown",
        error: "Invalid request - missing required fields",
        code: "INVALID_REQUEST",
      };
      this.repSocket.send(JSON.stringify(errorResponse));
      return;
    }

    const handler = this.requestHandlers.get(operation);
    if (!handler) {
      const errorResponse = {
        type: "response",
        correlationId,
        error: `Operation '${operation}' not supported`,
        code: "OPERATION_NOT_FOUND",
      };
      this.repSocket.send(JSON.stringify(errorResponse));
      return;
    }

    try {
      console.debug(
        chalk.blue(
          `AtomRequest: Processing REQ ${correlationId} for operation '${operation}'`,
        ),
      );

      const requestContext = {
        correlationId,
        sender,
        timestamp: request.timestamp,
      };

      const result = await handler(data, requestContext);

      // Send success response
      const successResponse = {
        type: "response",
        correlationId,
        result,
        timestamp: Date.now(),
      };

      this.repSocket.send(JSON.stringify(successResponse));
      console.debug(
        chalk.green(`AtomRequest: Sent response for ${correlationId}`),
      );
    } catch (error) {
      console.error(
        chalk.red(
          `AtomRequest: Handler error for ${operation} - ${error.message}`,
        ),
      );

      // Send error response
      const errorResponse = {
        type: "response",
        correlationId,
        error: error.message,
        code: "HANDLER_ERROR",
        timestamp: Date.now(),
      };

      this.repSocket.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Find service interface from nucleus
   * @private
   */
  async _findServiceInterface(serviceName) {
    try {
      if (!process.nucleus || !process.nucleus.getInterfaceIfActive) {
        throw new Error("Nucleus not available");
      }

      const interfaceInfo = await process.nucleus.getInterfaceIfActive(
        `Atom.Interface:::${serviceName}`,
      );
      return interfaceInfo;
    } catch (error) {
      console.warn(
        `AtomRequest: Could not find service '${serviceName}' - ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Cleanup idle request sockets
   * @private
   */
  _cleanupIdleSockets() {
    // Clean up any old REQ sockets (they should be closed after each request anyway)
    // This is mainly for housekeeping
    console.debug("AtomRequest: Periodic socket cleanup completed");
  }

  /**
   * Get request handling statistics
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      registeredHandlers: Array.from(this.requestHandlers.keys()),
      repSocketAddress: this.repSocketAddress,
      isReady: !!this.repSocket,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.repSocket) {
      this.repSocket.close();
      this.repSocket = null;
    }

    // Close any active REQ sockets
    this.activeRequestSockets.forEach((socket) => {
      if (socket) socket.close();
    });
    this.activeRequestSockets.clear();

    this.requestHandlers.clear();
  }
}

// Singleton instance
let atomRequestInstance = null;

function getAtomRequest() {
  if (!atomRequestInstance) {
    atomRequestInstance = new AtomRequest();
  }
  return atomRequestInstance;
}

// API - maintain backward compatibility
const AtomRequestAPI = {
  /**
   * Send a request
   */
  send: (targetService, operation, data, options) => {
    return getAtomRequest().send(targetService, operation, data, options);
  },

  /**
   * Register request handler
   */
  handle: (operation, handler) => {
    return getAtomRequest().handle(operation, handler);
  },

  /**
   * Remove request handler
   */
  unhandle: (operation) => {
    return getAtomRequest().unhandle(operation);
  },

  /**
   * Setup interface (should be called during service initialization)
   */
  setupInterface: (atomInterface) => {
    return getAtomRequest().setupInterface(atomInterface);
  },

  /**
   * Get statistics
   */
  getStats: () => {
    return getAtomRequest().getStats();
  },
};

module.exports = AtomRequestAPI;
