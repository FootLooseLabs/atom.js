# Atom.js Framework

A simple (not overly abstracted) microservices communication framework built on ZeroMQ, providing seamless inter-process communication with automatic service discovery, message routing, and schema-based message validation.

Think of it as an architecture for building networked functions - enabling functions across different programs to discover, communicate & invoke each other.

### Key Features

- **Service Discovery**: Automatic discovery and connection to services via Redis + UDP multicasting
- **ZeroMQ Abstraction**: Clean interface layer over ZeroMQ sockets with connection management
- **Message Routing**: Publish/subscribe messaging system with topic-based routing
- **Schema Validation**: Built-in message schema validation and structure enforcement
- **Fault Tolerance**: Automatic retry logic and graceful degradation
- **Order-Agnostic Startup**: Services can be started in any order with automatic connection resolution

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Service A     │    │   Service B     │    │   Service C     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │atom.interface│ │    │ │atom.interface│ │    │ │atom.interface│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Nucleus Daemon        │
                    │  (Redis + UDP Multicast)  │
                    │                           │
                    │ • Service Registry        │
                    │ • Connection Brokering    │
                    │ • Health Monitoring       │
                    └───────────────────────────┘
```

## Core Components

### 1. Atom.Interface
The primary abstraction layer that manages ZeroMQ socket connections and provides service registration.

**Key Responsibilities:**
- Service registration and discovery
- ZeroMQ socket lifecycle management
- Connection pooling and retry logic
- Message routing and middleware support

### 2. Atom.Signal
Handles publish/subscribe messaging between services with automatic connection management.

**Features:**
- Publisher/Subscriber pattern implementation
- Topic-based message routing
- Automatic target service discovery
- Message buffering and delivery guarantees

### 3. Atom.Nucleus
Service discovery and registry system using Redis and UDP multicasting.

**Capabilities:**
- Distributed service registry
- Real-time service availability updates
- Connection brokering between services
- Health monitoring and failure detection

### 4. Atom.Lexeme (Lexicon System)
Schema definition and message validation system for ensuring reliable communication.

**Purpose:**
- Define message structures and contracts
- Runtime message validation
- Type safety and documentation
- API contract enforcement

## Quick Start

### Installation

```bash
npm install --save github:FootLooseLabs/atom.js#master
```

### Prerequisites

- **Node.js**: Version 12 or higher
- **Atom-Cli**: Launch atom nucleus with atom -s. (this is required for service discovery)
  - Install from: https://github.com/footLooseLabs/atom-cli

### Basic Service Setup

```javascript
const AtomLexeme = require('atom').Lexeme;

// Define your lexicon (message schemas)
const UserCreated = class extends AtomLexeme {
  static schema = {
    userId: "",
    email: "",
    timestamp: 0
  };
};

const OrderProcessed = class extends AtomLexeme {
  static schema = {
    orderId: "",
    userId: "",
    amount: 0,
    status: ""
  };
};

const lexicon = {
  "UserCreated": UserCreated,
  "OrderProcessed": OrderProcessed
};

// Configure your service interface
const serviceConfig = {
  name: "@myapp/user-service",
  config: {
    port: 8050,
    eventsPort: 8051,
    lexicon,
    connections: {
      // Define connections to other services
      "UserCreated": "@myapp/notification-service|||user-created<-->OnUserCreated"
    },
    eventHandlers: {
      "user-validation": onUserValidation,
      "password-reset": onPasswordReset
    }
  }
};

// Initialize and activate the service
global._interface = new Atom.Interface(serviceConfig);
_interface.advertiseAndActivate();

// Event handler functions
function onUserValidation(data) {
  console.log("Validating user:", data);
  // Handle user validation logic
}

function onPasswordReset(data) {
  console.log("Processing password reset:", data);
  // Handle password reset logic
}
```

### Publishing Messages

```javascript
// Publish a message to connected services
_interface.publish("user-created", {
  userId: "user123",
  email: "user@example.com",
  timestamp: Date.now()
});
```

### Request-Response Communication

The framework supports synchronous request-response patterns for when you need immediate responses:

```javascript
// Making a request and waiting for response
try {
  const user = await _interface.request("@myapp/user-service", "get-user", {
    userId: "123"
  });
  console.log("User data:", user);
} catch (error) {
  console.error("Request failed:", error);
}

// Request with custom timeout
const result = await _interface.request(
  "@myapp/order-service",
  "process-order",
  { orderId: "456" },
  { timeout: 5000 }
);

// Using static API
const response = await Atom.Request.send(
  "@myapp/user-service",
  "validate-user",
  { email: "user@example.com" }
);
```

### Handling Requests

Define request handlers in your service configuration:

```javascript
const serviceConfig = {
  name: "@myapp/user-service",
  config: {
    port: 8050,
    requestHandlers: {
      "get-user": async (data, context) => {
        const { userId } = data;
        const user = await getUserById(userId);
        return user;
      },

      "create-user": async (data, context) => {
        const newUser = await createUser(data);
        return { success: true, user: newUser };
      }
    }
  }
};

// Or register handlers dynamically
_interface.handleRequest("update-user", async (data, context) => {
  const updatedUser = await updateUser(data.userId, data.updates);
  return updatedUser;
});
```

### Using Signals for Direct Communication

```javascript
// Publishing to a specific service
const message = {
  orderId: "order456",
  userId: "user123",
  amount: 99.99,
  status: "completed"
};

Atom.Signal.publishToInterface(
  "@myapp/order-service|||order-processed",
  message
).then(result => {
  console.log("Message sent successfully:", result);
}).catch(error => {
  console.error("Failed to send message:", error);
});

// Subscribing to messages from a service
Atom.Signal.subscribeToInterface(
  "@myapp/payment-service|||payment-completed"
).then(status => {
  const signal = status.signal;

  signal.eventEmitter.on("payment-completed", (data) => {
    console.log("Payment completed:", data);
    // Handle payment completion
  });
});
```

## Configuration

### Interface Configuration Options

```javascript
{
  name: "@namespace/service-name",     // Unique service identifier
  config: {
    host: "127.0.0.1",                 // Service host (default: 127.0.0.1)
    port: 8050,                        // Main communication port
    eventsPort: 8051,                  // Events/pub-sub port
    lexicon: {},                       // Message schemas
    connections: {},                   // Service connection definitions
    eventHandlers: {},                 // Event handler functions
    requestHandlers: {}                // Request-response handler functions
  }
}
```

### Connection String Format

```
"EventName": "target-service|||topic<-->HandlerFunction"
```

- `target-service`: The service name to connect to
- `topic`: The message topic/channel
- `HandlerFunction`: Local function to handle the message

## Message Schema (Lexicon)

Define message structures to ensure type safety and API contracts:

```javascript
const AtomLexeme = require('atom').Lexeme;

// Define message schema classes
const UserProfile = class extends AtomLexeme {
  static schema = {
    userId: "",
    name: "",
    email: "",
    preferences: {
      notifications: true,
      theme: "light"
    },
    metadata: {}
  };
};

const ApiResponse = class extends AtomLexeme {
  static schema = {
    success: true,
    data: {},
    error: null,
    timestamp: 0
  };
};

const lexicon = {
  "UserProfile": UserProfile,
  "ApiResponse": ApiResponse
};

// Usage in service configuration
const serviceConfig = {
  name: "@myapp/profile-service",
  config: {
    lexicon,
    // ... other config
  }
};
```

### Benefits of Using Lexeme Classes

The `Atom.Lexeme` class-based approach provides several advantages over plain JavaScript objects:

```javascript
const AtomLexeme = require('atom').Lexeme;

const SomeMsgType = class extends AtomLexeme {
  static schema = {
    uid: null,
    message: "",
    subject: null,
    object: null,
    action: null,
    params: {},
    vector: {
      uid: null,
      vectorSpaceUid: null
    },
    sender: null,
    sessionInfo: {},
    membershipInfo: {},
    ts: null,
  };
};

// Create and validate message instances
const messageInstance = SomeMsgType.inflect({
  uid: "msg-123",
  message: "Hello World",
  action: "greet",
  ts: Date.now()
});

// Access validated data
const validatedData = messageInstance.get();
console.log(validatedData.message); // "Hello World"
```

**Key Benefits:**
- **Runtime Validation**: Automatic validation against the defined schema
- **Type Safety**: Ensures messages conform to expected structure
- **Instance Methods**: Built-in methods for data access and manipulation
- **Extensibility**: Can override validation and processing logic in subclasses
- **Error Handling**: Graceful handling of malformed messages

## Service Discovery

Services automatically discover each other through the Nucleus daemon:

1. **Service Registration**: When a service calls `advertiseAndActivate()`, it registers itself in the Redis registry
2. **Discovery**: Other services can find registered services by name
3. **Connection**: ZeroMQ connections are established automatically
4. **Health Monitoring**: Services monitor each other's availability

## Error Handling and Retry Logic

### Automatic Retry Configuration

```javascript
// Nucleus (Redis) connection retries
AtomNucleus.maxRetryAttempts = 50;  // ~5 minutes
AtomNucleus.retryDelay = 6000;      // 6 seconds

// Interface (Nucleus) connection retries
process.maxNucleusRetryAttempts = 30;  // ~3 minutes
process.nucleusRetryDelay = 6000;      // 6 seconds
```

### Connection Resilience

- Failed connections automatically retry when target services become available
- Services continue operating even when dependencies are temporarily unavailable
- Graceful degradation ensures system stability

## Reserved Variable Names ⚠️

**IMPORTANT**: The following variable names are reserved and used internally by Atom.js. Do not use them in your application code:

- `component` - Used globally for service component definition
- `interface` - Reserved for internal interface management

Using these variable names may cause unexpected behavior or conflicts with the framework's internal operations.

## Best Practices

### 1. Service Naming
- Use namespace prefixes: `@myapp/service-name`
- Keep names descriptive and consistent
- Avoid special characters except `-` and `_`

### 2. Message Design
- Define clear lexicon schemas for all messages
- Include version information in message structures
- Use meaningful topic names that describe the event

### 3. Error Handling
```javascript
// Always handle message publishing errors
_interface.publish("event-name", data).catch(error => {
  console.error("Failed to publish event:", error);
  // Implement fallback logic
});
```

### 4. Resource Management
```javascript
// Cleanup on process termination
process.on('SIGINT', () => {
  _interface.renounce();
  process.exit(0);
});
```

## Development Workflow

### 1. Start Atom Nucleus 
```bash
atom -s (or sudo atom -s)
```

### 2. Start Services (Any Order)
```bash
node user-service.js &
node order-service.js &
node notification-service.js &
```

### 3. Monitor Logs
Services will automatically discover and connect to each other, with clear logging showing connection status.

## Debugging

### Enable Debug Logging
```javascript
console.debug = console.log; // Enable debug output
```

### Common Log Messages
```
Info: Atom.Interface advertised - @myapp/user-service
DEBUG: Successfully Initialised Connection:<UserCreated>
AtomSignal:::publisher published wavelet = user-created:::{"userId":"123"}
```

## Production Considerations

### Scaling
- Each service instance should have unique ports
- Use load balancers for external traffic
- Consider Redis clustering for high availability

### Monitoring
- Monitor Redis connection health
- Track message throughput and latency
- Set up alerts for service discovery failures

### Security
- Secure Redis instance with authentication
- Use network segmentation for service communication
- Implement message encryption for sensitive data

## API Reference

### Atom.Interface

#### Constructor
```javascript
new Atom.Interface(options)
```

#### Methods
- `advertiseAndActivate()` - Register and activate the service
- `publish(topic, data)` - Publish a message to connected services
- `request(targetService, operation, data, options)` - Send request and wait for response
- `handleRequest(operation, handler)` - Register a request handler
- `removeRequestHandler(operation)` - Remove a request handler
- `getRequestStats()` - Get request handling statistics
- `renounce()` - Unregister the service

### Atom.Signal

#### Static Methods
- `publishToInterface(target, message)` - Send message to specific service
- `subscribeToInterface(target)` - Subscribe to messages from specific service

### Atom.Request

#### Static Methods
- `send(targetService, operation, data, options)` - Send request and wait for response
- `handle(operation, handler)` - Register a global request handler
- `unhandle(operation)` - Remove a global request handler
- `getStats()` - Get global request statistics
- `destroy()` - Cleanup and shutdown request system

### Atom.Nucleus

#### Properties
- `readystate` - Current connection state
- `redisClient` - Redis client instance

## Troubleshooting

### Common Issues

**Redis Connection Failed**
```
WARNING: Redis connection failed - Retry attempt 5/50 in 6s
```
- Ensure Redis server is running
- Check network connectivity
- Verify Redis configuration

**Service Not Found**
```
Error finding @myapp/target-service - it is not available or running
```
- Verify target service is running and advertised
- Check service name spelling
- Ensure nucleus daemon is operational

**Port Conflicts**
```
Error: listen EADDRINUSE :::8050
```
- Check if port is already in use
- Use different ports for each service instance
- Kill processes using conflicting ports

**Request Timeout**
```
AtomRequest: Request timeout after 10000ms for @myapp/target-service::operation
```
- Check if target service is running and handling requests
- Increase timeout value in request options
- Verify operation name matches registered handler

**Request Handler Not Found**
```
Operation 'unknown-op' not supported
```
- Ensure operation handler is registered on target service
- Check handler registration in service config
- Verify operation name spelling

## Contributing

This framework is part of our internal microservices architecture. For questions, issues, or feature requests, please reach out to the development team.

## Questions, Concerns & Feedback

### Architectural Questions
- **Q: How does the framework handle service failures and recovery?**
  - The framework implements automatic retry logic at multiple levels (Redis connection, service discovery, message delivery) with configurable timeouts and backoff strategies.

- **Q: Can services run across different machines/containers?**
  - Yes, as long as they can reach the same Redis instance and have proper network connectivity for ZeroMQ communication.

### Performance Considerations
- **Memory Usage**: Each service maintains connection pools and message buffers. Monitor memory usage in high-throughput scenarios.
- **Network Overhead**: UDP multicasting and Redis queries add network overhead. Consider caching strategies for frequently accessed service information.

### Potential Improvements
1. **Message Versioning**: Consider adding automatic message version handling for backward compatibility
2. **Circuit Breaker Pattern**: Implement circuit breakers for failing service connections
3. **Metrics Collection**: Built-in metrics collection for monitoring message throughput and latency
4. **Configuration Management**: Centralized configuration management through Redis or external config service

### Known Limitations
- Redis is a single point of failure for service discovery
- ZeroMQ connections are not encrypted by default
- No built-in authentication/authorization mechanism. You should implement it at service level or create a gateway service.
- Limited support for message ordering guarantees across multiple services

For additional questions or to report issues, feel free to reach out.
