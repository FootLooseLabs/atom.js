const AtomRequest = require('./main');

/**
 * Integration helper to automatically setup request handling on interfaces
 */
class RequestIntegration {
  /**
   * Setup request handling on an interface
   * @param {Object} atomInterface - The atom interface instance
   */
  static setup(atomInterface) {
    if (!atomInterface) {
      throw new Error('RequestIntegration: Interface is required');
    }

    // Setup the request system
    AtomRequest.setupInterface(atomInterface);

    // Add convenience methods to interface
    atomInterface.request = (targetService, operation, data, options) => {
      return AtomRequest.send(targetService, operation, data, options);
    };

    atomInterface.handleRequest = (operation, handler) => {
      return AtomRequest.handle(operation, handler);
    };

    atomInterface.removeRequestHandler = (operation) => {
      return AtomRequest.unhandle(operation);
    };

    atomInterface.getRequestStats = () => {
      return AtomRequest.getStats();
    };

    console.debug('RequestIntegration: Interface enhanced with request capabilities');
  }

  /**
   * Auto-register request handlers from interface config
   * @param {Object} atomInterface - The atom interface instance
   */
  static autoRegisterHandlers(atomInterface) {
    if (!atomInterface.config || !atomInterface.config.requestHandlers) {
      return;
    }

    const handlers = atomInterface.config.requestHandlers;
    let registered = 0;

    for (const [operation, handler] of Object.entries(handlers)) {
      if (typeof handler === 'function') {
        AtomRequest.handle(operation, handler);
        registered++;
      } else {
        console.warn(`RequestIntegration: Skipping non-function handler for operation '${operation}'`);
      }
    }

    if (registered > 0) {
      console.debug(`RequestIntegration: Auto-registered ${registered} request handlers`);
    }
  }
}

module.exports = RequestIntegration;
