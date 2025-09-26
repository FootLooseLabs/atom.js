const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const chalk = require('chalk');

class AtomRequest extends EventEmitter {
  constructor() {
    super();
    this.pendingRequests = new Map(); // correlationId -> { resolve, reject, timeout, timestamp }
    this.requestHandlers = new Map(); // operation -> handler function
    this.defaultTimeout = 10000; // 10 seconds
    this.maxPendingRequests = 1000;

    // Cleanup expired requests every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this._cleanupExpiredRequests();
    }, 30000);
  }

  /**
   * Send a request and wait for response
   * @param {string} targetService - Service name (e.g., "@myapp/user-service")
   * @param {string} operation - Operation name (e.g., "get-user")
   * @param {Object} data - Request data
   * @param {Object} options - Options { timeout, channel }
   * @returns {Promise} - Resolves with response or rejects with error
   */
  async send(targetService, operation, data = {}, options = {}) {
    if (!global._interface) {
      throw new Error('AtomRequest: No active atom interface found. Ensure service is initialized.');
    }

    const timeout = options.timeout || this.defaultTimeout;
    const channel = options.channel || 'atom-request';
    const correlationId = uuidv4();

    // Check pending request limit
    if (this.pendingRequests.size >= this.maxPendingRequests) {
      throw new Error('AtomRequest: Maximum pending requests limit reached');
    }

    const requestMessage = {
      type: 'request',
      correlationId,
      operation,
      data,
      timestamp: Date.now(),
      sender: global._interface.name,
      target: targetService
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`AtomRequest: Request timeout after ${timeout}ms for ${targetService}::${operation}`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        timestamp: Date.now(),
        operation,
        targetService
      });

      // Send request via existing pub/sub
      const targetChannel = `${targetService}|||${channel}`;

      try {
        global._interface.publish(targetChannel, requestMessage);
        console.debug(chalk.blue(`AtomRequest: Sent request ${correlationId} to ${targetService}::${operation}`));
      } catch (error) {
        // Cleanup on send failure
        this.pendingRequests.delete(correlationId);
        clearTimeout(timeoutHandle);
        reject(new Error(`AtomRequest: Failed to send request - ${error.message}`));
      }
    });
  }

  /**
   * Register a request handler for an operation
   * @param {string} operation - Operation name
   * @param {Function} handler - Handler function (data, context) => response
   */
  handle(operation, handler) {
    if (typeof handler !== 'function') {
      throw new Error('AtomRequest: Handler must be a function');
    }

    this.requestHandlers.set(operation, handler);
    console.debug(chalk.green(`AtomRequest: Registered handler for operation '${operation}'`));
  }

  /**
   * Remove a request handler
   * @param {string} operation - Operation name
   */
  unhandle(operation) {
    const removed = this.requestHandlers.delete(operation);
    if (removed) {
      console.debug(chalk.yellow(`AtomRequest: Unregistered handler for operation '${operation}'`));
    }
    return removed;
  }

  /**
   * Process incoming request message
   * @param {Object} message - Incoming message
   * @param {Object} context - Message context
   */
  async _processIncomingMessage(message, context = {}) {
    try {
      if (!message || typeof message !== 'object') {
        console.warn('AtomRequest: Invalid message format received');
        return;
      }

      if (message.type === 'request') {
        await this._handleRequest(message, context);
      } else if (message.type === 'response') {
        this._handleResponse(message);
      }
    } catch (error) {
      console.error(chalk.red(`AtomRequest: Error processing message - ${error.message}`));
    }
  }

  /**
   * Handle incoming request
   * @private
   */
  async _handleRequest(message, context) {
    const { correlationId, operation, data, sender } = message;

    if (!correlationId || !operation || !sender) {
      console.warn('AtomRequest: Invalid request message - missing required fields');
      return;
    }

    const handler = this.requestHandlers.get(operation);
    if (!handler) {
      // Send error response
      await this._sendResponse(sender, correlationId, {
        error: `Operation '${operation}' not supported`,
        code: 'OPERATION_NOT_FOUND'
      });
      return;
    }

    try {
      console.debug(chalk.blue(`AtomRequest: Processing request ${correlationId} for operation '${operation}'`));

      const requestContext = {
        correlationId,
        sender,
        timestamp: message.timestamp,
        ...context
      };

      const result = await handler(data, requestContext);

      // Send success response
      await this._sendResponse(sender, correlationId, { result });

    } catch (error) {
      console.error(chalk.red(`AtomRequest: Handler error for ${operation} - ${error.message}`));

      // Send error response
      await this._sendResponse(sender, correlationId, {
        error: error.message,
        code: 'HANDLER_ERROR'
      });
    }
  }

  /**
   * Handle incoming response
   * @private
   */
  _handleResponse(message) {
    const { correlationId, data } = message;

    if (!correlationId) {
      console.warn('AtomRequest: Response missing correlation ID');
      return;
    }

    const pendingRequest = this.pendingRequests.get(correlationId);
    if (!pendingRequest) {
      console.warn(`AtomRequest: Received response for unknown correlation ID: ${correlationId}`);
      return;
    }

    // Cleanup
    this.pendingRequests.delete(correlationId);
    clearTimeout(pendingRequest.timeout);

    console.debug(chalk.green(`AtomRequest: Received response for ${correlationId}`));

    // Resolve or reject promise
    if (data.error) {
      pendingRequest.reject(new Error(`AtomRequest: ${data.error} (${data.code || 'UNKNOWN_ERROR'})`));
    } else {
      pendingRequest.resolve(data.result);
    }
  }

  /**
   * Send response back to requester
   * @private
   */
  async _sendResponse(targetService, correlationId, data) {
    if (!global._interface) {
      console.error('AtomRequest: No active interface for sending response');
      return;
    }

    const responseMessage = {
      type: 'response',
      correlationId,
      data,
      timestamp: Date.now(),
      sender: global._interface.name
    };

    const responseChannel = `${targetService}|||atom-response`;

    try {
      global._interface.publish(responseChannel, responseMessage);
      console.debug(chalk.blue(`AtomRequest: Sent response ${correlationId} to ${targetService}`));
    } catch (error) {
      console.error(chalk.red(`AtomRequest: Failed to send response - ${error.message}`));
    }
  }

  /**
   * Setup request/response channels on interface
   * @param {Object} interface - Atom interface instance
   */
  setupInterface(atomInterface) {
    if (!atomInterface) {
      throw new Error('AtomRequest: Interface is required');
    }

    // Subscribe to request channel
    atomInterface.eventHandlers = atomInterface.eventHandlers || {};

    // Handle incoming requests
    atomInterface.eventHandlers['atom-request'] = (data) => {
      this._processIncomingMessage(data);
    };

    // Handle incoming responses
    atomInterface.eventHandlers['atom-response'] = (data) => {
      this._processIncomingMessage(data);
    };

    console.debug(chalk.green('AtomRequest: Interface setup completed'));
  }

  /**
   * Cleanup expired requests
   * @private
   */
  _cleanupExpiredRequests() {
    const now = Date.now();
    const expired = [];

    for (const [correlationId, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > (this.defaultTimeout * 2)) {
        expired.push(correlationId);
      }
    }

    expired.forEach(correlationId => {
      const request = this.pendingRequests.get(correlationId);
      if (request) {
        clearTimeout(request.timeout);
        this.pendingRequests.delete(correlationId);
        request.reject(new Error('AtomRequest: Request expired during cleanup'));
      }
    });

    if (expired.length > 0) {
      console.debug(chalk.yellow(`AtomRequest: Cleaned up ${expired.length} expired requests`));
    }
  }

  /**
   * Get request statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      registeredHandlers: this.requestHandlers.size,
      maxPendingRequests: this.maxPendingRequests,
      defaultTimeout: this.defaultTimeout
    };
  }

  /**
   * Shutdown and cleanup
   */
  destroy() {
    // Clear all pending requests
    for (const [correlationId, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('AtomRequest: Service shutting down'));
    }
    this.pendingRequests.clear();

    // Clear handlers
    this.requestHandlers.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.debug(chalk.yellow('AtomRequest: Destroyed'));
  }
}

// Singleton instance
let atomRequestInstance = null;

/**
 * Get or create AtomRequest singleton
 * @returns {AtomRequest} Singleton instance
 */
function getAtomRequest() {
  if (!atomRequestInstance) {
    atomRequestInstance = new AtomRequest();
  }
  return atomRequestInstance;
}

// Static methods for easy access
const AtomRequestAPI = {
  /**
   * Send a request
   */
  send: (targetService, operation, data, options) => {
    return getAtomRequest().send(targetService, operation, data, options);
  },

  /**
   * Register a request handler
   */
  handle: (operation, handler) => {
    return getAtomRequest().handle(operation, handler);
  },

  /**
   * Remove a request handler
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

  /**
   * Get raw instance for advanced usage
   */
  getInstance: () => {
    return getAtomRequest();
  },

  /**
   * Destroy instance
   */
  destroy: () => {
    if (atomRequestInstance) {
      atomRequestInstance.destroy();
      atomRequestInstance = null;
    }
  }
};

module.exports = AtomRequestAPI;
