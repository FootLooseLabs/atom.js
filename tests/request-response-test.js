const Atom = require('../src/index');

// Test configuration
const TEST_TIMEOUT = 15000;

console.log('=== Atom Request-Response Test ===\n');

// Mock component for testing
global.component = {
  name: 'TestComponent',
  version: '1.0.0-test'
};

// Test: Basic Request-Response
async function testBasicRequestResponse() {
  console.log('Test 1: Basic Request-Response');

  // Setup server service
  const serverConfig = {
    name: "@test/server-service",
    config: {
      port: 9001,
      requestHandlers: {
        'echo': (data, context) => {
          console.log(`  Server received: ${JSON.stringify(data)}`);
          return {
            echoed: data,
            timestamp: Date.now(),
            correlationId: context.correlationId
          };
        },
        'add-numbers': (data, context) => {
          const { a, b } = data;
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new Error('Invalid input: both a and b must be numbers');
          }
          return { result: a + b };
        }
      }
    }
  };

  const serverInterface = new Atom.Interface(serverConfig);
  serverInterface.advertiseAndActivate();

  // Setup client service
  setTimeout(async () => {
    const clientConfig = {
      name: "@test/client-service",
      config: {
        port: 9002
      }
    };

    const clientInterface = new Atom.Interface(clientConfig);
    clientInterface.advertiseAndActivate();

    // Wait for services to be ready
    setTimeout(async () => {
      try {
        console.log('  Making echo request...');
        const response = await clientInterface.request(
          '@test/server-service',
          'echo',
          { message: 'Hello World', testId: 'test-1' }
        );
        console.log('  ✓ Echo response:', response);

        console.log('  Making add-numbers request...');
        const mathResponse = await clientInterface.request(
          '@test/server-service',
          'add-numbers',
          { a: 5, b: 3 }
        );
        console.log('  ✓ Math response:', mathResponse);

        console.log('  Test 1 PASSED\n');
        testErrorHandling(clientInterface, serverInterface);

      } catch (error) {
        console.error('  ✗ Test 1 FAILED:', error.message);
        process.exit(1);
      }
    }, 1500);

  }, 1000);
}

// Test: Error handling
async function testErrorHandling(clientInterface, serverInterface) {
  console.log('Test 2: Error Handling');

  try {
    // Test handler error
    console.log('  Testing handler error...');
    try {
      await clientInterface.request(
        '@test/server-service',
        'add-numbers',
        { a: 'invalid', b: 'input' }
      );
      console.error('  ✗ Should have thrown error');
      process.exit(1);
    } catch (error) {
      console.log('  ✓ Caught expected error:', error.message);
    }

    // Test non-existent operation
    console.log('  Testing non-existent operation...');
    try {
      await clientInterface.request(
        '@test/server-service',
        'non-existent-operation',
        { test: 'data' }
      );
      console.error('  ✗ Should have thrown error');
      process.exit(1);
    } catch (error) {
      console.log('  ✓ Caught expected error:', error.message);
    }

    console.log('  Test 2 PASSED\n');
    testTimeout(clientInterface, serverInterface);

  } catch (error) {
    console.error('  ✗ Test 2 FAILED:', error.message);
    process.exit(1);
  }
}

// Test: Timeout handling
async function testTimeout(clientInterface, serverInterface) {
  console.log('Test 3: Timeout Handling');

  try {
    // Add slow handler
    serverInterface.handleRequest('slow-operation', async (data, context) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { delayed: true };
    });

    console.log('  Testing timeout...');
    try {
      await clientInterface.request(
        '@test/server-service',
        'slow-operation',
        { test: 'data' },
        { timeout: 1000 }
      );
      console.error('  ✗ Should have timed out');
      process.exit(1);
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log('  ✓ Request timed out as expected');
      } else {
        throw error;
      }
    }

    console.log('  Test 3 PASSED\n');
    testStaticAPI(clientInterface, serverInterface);

  } catch (error) {
    console.error('  ✗ Test 3 FAILED:', error.message);
    process.exit(1);
  }
}

// Test: Static API
async function testStaticAPI(clientInterface, serverInterface) {
  console.log('Test 4: Static API');

  try {
    console.log('  Using Atom.Request.send...');
    const response = await Atom.Request.send(
      '@test/server-service',
      'echo',
      { message: 'Static API Test' }
    );
    console.log('  ✓ Static API response:', response);

    console.log('  Test 4 PASSED\n');
    testStats(clientInterface, serverInterface);

  } catch (error) {
    console.error('  ✗ Test 4 FAILED:', error.message);
    process.exit(1);
  }
}

// Test: Stats and monitoring
async function testStats(clientInterface, serverInterface) {
  console.log('Test 5: Stats and Monitoring');

  try {
    const stats = clientInterface.getRequestStats();
    console.log('  ✓ Request stats:', stats);

    if (typeof stats.pendingRequests === 'number' &&
        typeof stats.registeredHandlers === 'number') {
      console.log('  ✓ Stats have correct structure');
    } else {
      throw new Error('Stats structure is invalid');
    }

    console.log('  Test 5 PASSED\n');
    testCleanup();

  } catch (error) {
    console.error('  ✗ Test 5 FAILED:', error.message);
    process.exit(1);
  }
}

// Test: Cleanup
function testCleanup() {
  console.log('Test 6: Cleanup');

  try {
    Atom.Request.destroy();
    console.log('  ✓ Request system destroyed');
    console.log('  Test 6 PASSED\n');

    console.log('🎉 All tests PASSED!');
    process.exit(0);

  } catch (error) {
    console.error('  ✗ Test 6 FAILED:', error.message);
    process.exit(1);
  }
}

// Set timeout for entire test
setTimeout(() => {
  console.error('✗ Test suite timed out after', TEST_TIMEOUT, 'ms');
  process.exit(1);
}, TEST_TIMEOUT);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nCleaning up...');
  Atom.Request.destroy();
  process.exit(0);
});

// Start tests
console.log('Starting request-response tests...\n');
testBasicRequestResponse();
