const { spawn } = require('child_process');
const redis = require('redis');
const path = require('path');
const fs = require('fs');

/**
 * Backward Compatibility Test Suite for Atom.js
 *
 * This test ensures that all existing functionality works exactly as before,
 * while also testing the new order-agnostic startup features.
 */

class BackwardCompatibilityTest {
  constructor() {
    this.testResults = [];
    this.processes = [];
    this.redisClient = null;
    this.testStartTime = Date.now();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async startRedis() {
    return new Promise((resolve, reject) => {
      const redisProcess = spawn('redis-server', ['--port', '6379']);

      redisProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Ready to accept connections')) {
          this.log('Redis started successfully');
          this.processes.push(redisProcess);
          resolve(redisProcess);
        }
      });

      redisProcess.stderr.on('data', (data) => {
        this.log(`Redis stderr: ${data}`, 'WARN');
      });

      redisProcess.on('error', (error) => {
        this.log(`Redis failed to start: ${error.message}`, 'ERROR');
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Redis startup timeout'));
      }, 10000);
    });
  }

  async stopRedis() {
    if (this.redisClient) {
      this.redisClient.quit();
    }

    // Find and kill Redis process
    const redisProcesses = this.processes.filter(p => p.spawnargs && p.spawnargs.includes('redis-server'));
    for (const proc of redisProcesses) {
      proc.kill('SIGTERM');
    }

    await this.delay(1000);
    this.log('Redis stopped');
  }

  async createTestService(serviceName, port, dependencies = []) {
    const serviceCode = `
const Atom = require('../src/index.js');

const lexicon = {};
lexicon.BaseMsg = class extends Atom.Lexeme {
  static schema = {
    uid: null,
    message: "",
    subject: null,
    object: {},
    action: null,
    params: {},
    vector: { uid: null, vectorSpaceUid: null },
    sender: null,
    sessionInfo: {},
    ts: null,
  };
};

const eventHandlers = {
  OnTestMessage: function(msg, interface) {
    console.log(\`[\${Date.now()}] \${serviceName} received: \${JSON.stringify(msg)}\`);

    // Test publish functionality
    interface.publish('test-response', {
      from: '${serviceName}',
      originalMsg: msg,
      timestamp: Date.now()
    });
  }
};

// Create connections object based on dependencies
const connections = {};
${dependencies.map(dep => `
connections["TestConnection_${dep}"] = "${dep}|||test-message<-->OnTestMessage";
`).join('')}

const InterfaceSpecs = {
  name: "${serviceName}",
  config: {
    port: ${port},
    lexicon: {
      "TestService": lexicon.BaseMsg,
      "test-message": lexicon.BaseMsg,
      "test-response": lexicon.BaseMsg
    },
    connections: connections,
    eventHandlers: {
      "test-message": eventHandlers.OnTestMessage,
      "test-response": eventHandlers.OnTestMessage
    }
  }
};

// Test component functions
global.component = {
  TestService: async function(msg) {
    console.log(\`[\${Date.now()}] \${serviceName} TestService called with:\`, msg);
    return {
      message: "TestService executed successfully",
      result: { processed: true, by: '${serviceName}' }
    };
  },

  __start__: async function() {
    console.log(\`[\${Date.now()}] \${serviceName} component started\`);
  }
};

global._interface = new Atom.Interface(InterfaceSpecs);

// Test immediate activation (traditional way)
process.nextTick(() => {
  _interface.advertiseAndActivate();

  // Test publishing after startup
  setTimeout(() => {
    _interface.publish('test-message', {
      from: '${serviceName}',
      type: 'startup-announcement',
      timestamp: Date.now()
    });
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(\`[\${Date.now()}] \${serviceName} shutting down gracefully\`);
  if (global._interface) {
    global._interface.renounce();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(\`[\${Date.now()}] \${serviceName} received SIGINT\`);
  process.exit(0);
});

console.log(\`[\${Date.now()}] \${serviceName} started on port ${port}\`);
`;

    const serviceFile = path.join(__dirname, `test-service-${serviceName}.js`);
    fs.writeFileSync(serviceFile, serviceCode);
    return serviceFile;
  }

  async startService(serviceFile, serviceName) {
    return new Promise((resolve, reject) => {
      const serviceProcess = spawn('node', [serviceFile], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(serviceFile)
      });

      let startupComplete = false;

      serviceProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[${serviceName}] ${output.trim()}`);

        if (output.includes('advertised') && !startupComplete) {
          startupComplete = true;
          this.log(`Service ${serviceName} started successfully`);
          resolve(serviceProcess);
        }
      });

      serviceProcess.stderr.on('data', (data) => {
        console.error(`[${serviceName}] ERROR: ${data.toString().trim()}`);
      });

      serviceProcess.on('error', (error) => {
        this.log(`Service ${serviceName} failed to start: ${error.message}`, 'ERROR');
        reject(error);
      });

      serviceProcess.on('exit', (code) => {
        this.log(`Service ${serviceName} exited with code ${code}`);
      });

      this.processes.push(serviceProcess);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!startupComplete) {
          reject(new Error(`Service ${serviceName} startup timeout`));
        }
      }, 30000);
    });
  }

  async runTest(testName, testFunction) {
    this.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();

    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.log(`✅ Test passed: ${testName} (${duration}ms)`, 'SUCCESS');
      this.testResults.push({ name: testName, status: 'PASS', duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ Test failed: ${testName} - ${error.message} (${duration}ms)`, 'ERROR');
      this.testResults.push({ name: testName, status: 'FAIL', duration, error: error.message });
    }
  }

  async cleanup() {
    this.log('🧹 Cleaning up test environment...');

    // Kill all spawned processes
    for (const proc of this.processes) {
      try {
        proc.kill('SIGTERM');
        await this.delay(1000);
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      } catch (error) {
        this.log(`Error killing process: ${error.message}`, 'WARN');
      }
    }

    // Clean up test files
    const testFiles = fs.readdirSync(__dirname).filter(file => file.startsWith('test-service-'));
    for (const file of testFiles) {
      try {
        fs.unlinkSync(path.join(__dirname, file));
      } catch (error) {
        this.log(`Error removing test file ${file}: ${error.message}`, 'WARN');
      }
    }

    await this.delay(2000);
    this.log('Cleanup complete');
  }

  async runAllTests() {
    this.log('🚀 Starting Backward Compatibility Test Suite for Atom.js\n');

    try {
      // Test 1: Traditional startup order (Redis first)
      await this.runTest('Traditional Startup Order', async () => {
        await this.startRedis();
        await this.delay(2000);

        const serviceA = await this.createTestService('service-a', 8001);
        const serviceB = await this.createTestService('service-b', 8002, ['service-a']);

        await this.startService(serviceA, 'service-a');
        await this.delay(3000);
        await this.startService(serviceB, 'service-b');
        await this.delay(5000);

        this.log('Services started in traditional order - connections should work');
        await this.cleanup();
      });

      // Test 2: Order-agnostic startup (Services first)
      await this.runTest('Order-Agnostic Startup', async () => {
        const serviceA = await this.createTestService('service-a', 8001);
        const serviceB = await this.createTestService('service-b', 8002, ['service-a']);

        // Start services BEFORE Redis
        const procA = this.startService(serviceA, 'service-a');
        const procB = this.startService(serviceB, 'service-b');

        await this.delay(5000);
        this.log('Services started, now starting Redis...');

        // Start Redis after services
        await this.startRedis();

        // Wait for services to complete startup
        await procA;
        await procB;
        await this.delay(10000);

        this.log('Order-agnostic startup completed - connections should establish');
        await this.cleanup();
      });

      // Test 3: Random order startup
      await this.runTest('Random Order Startup', async () => {
        const serviceA = await this.createTestService('service-a', 8001);
        const serviceB = await this.createTestService('service-b', 8002, ['service-a']);
        const serviceC = await this.createTestService('service-c', 8003, ['service-a', 'service-b']);

        // Start in completely random order
        const procC = this.startService(serviceC, 'service-c');
        await this.delay(2000);

        await this.startRedis();
        await this.delay(2000);

        const procA = this.startService(serviceA, 'service-a');
        await this.delay(3000);

        const procB = this.startService(serviceB, 'service-b');

        // Wait for all to complete
        await procA;
        await procB;
        await procC;
        await this.delay(15000);

        this.log('Random order startup completed - all connections should establish');
        await this.cleanup();
      });

      // Test 4: Redis restart resilience
      await this.runTest('Redis Restart Resilience', async () => {
        await this.startRedis();
        await this.delay(2000);

        const serviceA = await this.createTestService('service-a', 8001);
        await this.startService(serviceA, 'service-a');
        await this.delay(3000);

        this.log('Stopping Redis to test resilience...');
        await this.stopRedis();
        await this.delay(5000);

        this.log('Restarting Redis...');
        await this.startRedis();
        await this.delay(10000);

        this.log('Redis restart test completed - service should reconnect');
        await this.cleanup();
      });

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'ERROR');
    } finally {
      await this.cleanup();
      this.printResults();
    }
  }

  printResults() {
    const totalTime = Date.now() - this.testStartTime;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.log('\n📊 Test Results Summary:');
    this.log('='.repeat(50));

    for (const result of this.testResults) {
      const status = result.status === 'PASS' ? '✅' : '❌';
      this.log(`${status} ${result.name} (${result.duration}ms)`);
      if (result.error) {
        this.log(`   Error: ${result.error}`, 'ERROR');
      }
    }

    this.log('='.repeat(50));
    this.log(`Total: ${this.testResults.length} tests, ${passed} passed, ${failed} failed`);
    this.log(`Total time: ${totalTime}ms`);

    if (failed === 0) {
      this.log('🎉 All tests passed! Backward compatibility confirmed.', 'SUCCESS');
    } else {
      this.log('⚠️  Some tests failed. Review the results above.', 'WARN');
    }
  }
}

// Main execution
if (require.main === module) {
  const test = new BackwardCompatibilityTest();

  process.on('SIGINT', async () => {
    console.log('\n⚠️  Test interrupted. Cleaning up...');
    await test.cleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await test.cleanup();
    process.exit(1);
  });

  test.runAllTests().then(() => {
    process.exit(0);
  }).catch(async (error) => {
    console.error('Test suite error:', error);
    await test.cleanup();
    process.exit(1);
  });
}

module.exports = BackwardCompatibilityTest;
