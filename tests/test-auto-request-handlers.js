#!/usr/bin/env node

/**
 * Test script for auto-generated REQ/REP handlers from lexicon
 *
 * This tests that:
 * 1. Handlers are auto-generated from lexicon definitions
 * 2. PUB/SUB path still works (backward compatibility)
 * 3. REQ/REP path works with auto-generated handlers
 * 4. Both patterns can coexist
 */

const Atom = require('../src/index');
const chalk = require('chalk');

// Test configuration
const TEST_SERVICE_NAME = '@test/auto-handler-service';
const TEST_PORT = 9876;

// Global component for test service
global.component = {};

// Define test lexeme
class TestRequestLexeme extends Atom.Lexeme {
  static schema = {
    data: null,
    sender: null,
  };

  static inflection(info, params) {
    if (typeof info === 'string') {
      return JSON.parse(info);
    }
    return info;
  }
}

// Test component function (simulates existing PUB/SUB style function)
component.TestOperation = async function (inflection, paramsList) {
  console.log(chalk.blue('Component function called with:'), inflection);

  const input = inflection.data || inflection;

  // Simulate processing
  const result = {
    processed: input.value * 2,
    timestamp: Date.now(),
  };

  return {
    result: result,
    message: 'Operation completed successfully',
  };
};

// Initialize test service
const interfaceSpecs = {
  name: TEST_SERVICE_NAME,
  config: {
    port: TEST_PORT,
    lexicon: {
      TestOperation: TestRequestLexeme,
    },
  },
};

console.log(chalk.yellow('\n=== Starting Auto-Handler Test Service ===\n'));

global._interface = new Atom.Interface(interfaceSpecs);

// Wait a bit for nucleus to be ready
setTimeout(async () => {
  try {
    _interface.advertiseAndActivate();

    console.log(chalk.green('\n✓ Test service started\n'));

    // Give service time to start
    setTimeout(async () => {
      await runTests();
    }, 2000);

  } catch (error) {
    console.error(chalk.red('Failed to start test service:'), error);
    process.exit(1);
  }
}, 1000);

async function runTests() {
  console.log(chalk.yellow('\n=== Running Tests ===\n'));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Verify auto-generated handler exists
  try {
    console.log(chalk.blue('Test 1: Check auto-generated handler registration'));
    const stats = _interface.getRequestStats();
    console.log('Request stats:', stats);

    if (stats.registeredHandlers.includes('TestOperation')) {
      console.log(chalk.green('✓ Test 1 PASSED: Handler auto-generated'));
      testsPassed++;
    } else {
      console.log(chalk.red('✗ Test 1 FAILED: Handler not found'));
      testsFailed++;
    }
  } catch (error) {
    console.log(chalk.red('✗ Test 1 FAILED:'), error.message);
    testsFailed++;
  }

  // Test 2: Test REQ/REP call via auto-generated handler
  try {
    console.log(chalk.blue('\nTest 2: Call operation via REQ/REP'));

    const result = await _interface.request(
      TEST_SERVICE_NAME,
      'TestOperation',
      { data: { value: 21 } },  // Match lexeme schema format
      { timeout: 5000 }
    );

    console.log('Result received:', result);

    if (result && result.processed === 42) {
      console.log(chalk.green('✓ Test 2 PASSED: REQ/REP call successful'));
      testsPassed++;
    } else {
      console.log(chalk.red('✗ Test 2 FAILED: Unexpected result'), result);
      testsFailed++;
    }
  } catch (error) {
    console.log(chalk.red('✗ Test 2 FAILED:'), error.message);
    testsFailed++;
  }

  // Test 3: Test PUB/SUB still works (backward compatibility)
  try {
    console.log(chalk.blue('\nTest 3: Test PUB/SUB backward compatibility'));

    const signalResult = await Atom.Signal.publishToInterface(
      `${TEST_SERVICE_NAME}:::TestOperation`,
      { data: { value: 50 } }
    );

    if (signalResult && signalResult.statusCode === 2) {
      console.log(chalk.green('✓ Test 3 PASSED: PUB/SUB still works'));
      testsPassed++;
    } else {
      console.log(chalk.red('✗ Test 3 FAILED: PUB/SUB broken'));
      testsFailed++;
    }
  } catch (error) {
    console.log(chalk.red('✗ Test 3 FAILED:'), error.message);
    testsFailed++;
  }

  // Summary
  console.log(chalk.yellow('\n=== Test Summary ==='));
  console.log(chalk.green(`Passed: ${testsPassed}`));
  console.log(chalk.red(`Failed: ${testsFailed}`));

  if (testsFailed === 0) {
    console.log(chalk.green('\n✓ All tests passed!\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n✗ Some tests failed\n'));
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\nCleaning up...');
  if (_interface) {
    _interface.renounce();
  }
  process.exit();
});
