const Atom = require('../src/index');

// Example: User Service (Server)
console.log('=== Starting User Service ===');

// Define component for User Service
global.component = {
  name: 'UserService',
  version: '1.0.0'
};

// Request handlers
function handleGetUser(data, context) {
  console.log(`Processing get-user request for userId: ${data.userId}`);

  // Simulate database lookup
  const users = {
    '123': { id: '123', name: 'John Doe', email: 'john@example.com' },
    '456': { id: '456', name: 'Jane Smith', email: 'jane@example.com' }
  };

  const user = users[data.userId];
  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

function handleCreateUser(data, context) {
  console.log(`Processing create-user request:`, data);

  // Simulate user creation
  const newUser = {
    id: Math.random().toString(36).substr(2, 9),
    name: data.name,
    email: data.email,
    createdAt: new Date().toISOString()
  };

  console.log(`Created new user:`, newUser);
  return newUser;
}

// User Service Configuration
const userServiceConfig = {
  name: "@example/user-service",
  config: {
    port: 8050,
    requestHandlers: {
      'get-user': handleGetUser,
      'create-user': handleCreateUser
    },
    eventHandlers: {
      'atom-request': (data) => {
        console.log('Received request:', data);
      },
      'atom-response': (data) => {
        console.log('Received response:', data);
      }
    }
  }
};

// Initialize User Service
global._interface = new Atom.Interface(userServiceConfig);
_interface.advertiseAndActivate();

// Example: Order Service (Client)
setTimeout(() => {
  console.log('\n=== Starting Order Service (Client) ===');

  // Define component for Order Service
  global.component = {
    name: 'OrderService',
    version: '1.0.0'
  };

  const orderServiceConfig = {
    name: "@example/order-service",
    config: {
      port: 8060,
      eventHandlers: {
        'atom-response': (data) => {
          console.log('Order service received response:', data);
        }
      }
    }
  };

  // Create second interface for order service
  const orderInterface = new Atom.Interface(orderServiceConfig);
  orderInterface.advertiseAndActivate();

  // Wait a bit for services to be ready, then make requests
  setTimeout(async () => {
    console.log('\n=== Making Requests ===');

    try {
      // Example 1: Get user request
      console.log('1. Requesting user with ID 123...');
      const user = await orderInterface.request('@example/user-service', 'get-user', { userId: '123' });
      console.log('✓ Got user:', user);

      // Example 2: Create new user request
      console.log('\n2. Creating new user...');
      const newUser = await orderInterface.request('@example/user-service', 'create-user', {
        name: 'Alice Johnson',
        email: 'alice@example.com'
      });
      console.log('✓ Created user:', newUser);

      // Example 3: Request with custom timeout
      console.log('\n3. Request with custom timeout...');
      const userWithTimeout = await orderInterface.request(
        '@example/user-service',
        'get-user',
        { userId: '456' },
        { timeout: 5000 }
      );
      console.log('✓ Got user with timeout:', userWithTimeout);

      // Example 4: Request that will fail (user not found)
      console.log('\n4. Request that will fail...');
      try {
        await orderInterface.request('@example/user-service', 'get-user', { userId: '999' });
      } catch (error) {
        console.log('✓ Expected error:', error.message);
      }

      // Example 5: Using static API
      console.log('\n5. Using static Atom.Request API...');
      const staticResult = await Atom.Request.send('@example/user-service', 'get-user', { userId: '123' });
      console.log('✓ Static API result:', staticResult);

      // Show stats
      console.log('\n=== Request Stats ===');
      console.log(orderInterface.getRequestStats());

    } catch (error) {
      console.error('✗ Request failed:', error.message);
    }

  }, 2000);

}, 1000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (global._interface) {
    global._interface.renounce();
  }
  Atom.Request.destroy();
  process.exit(0);
});

console.log('\nExample running... Press Ctrl+C to exit');
