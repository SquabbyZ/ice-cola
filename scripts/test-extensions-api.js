/**
 * Extensions Backend Test Script
 * 
 * 测试扩展商店后端API功能
 * 使用方法: node scripts/test-extensions-api.js
 */

const WebSocket = require('ws');

// 配置
const GATEWAY_URL = process.env.GATEWAY_URL || 'ws://localhost:3001/gateway';
const TEST_USER_ID = 'test-user-001';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createRequest(id, method, params = {}) {
  return {
    type: 'req',
    id,
    method,
    params,
  };
}

async function testExtensionsAPI() {
  log('cyan', '\n🧪 Testing Extensions Backend API...\n');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL);
    const tests = [];
    let currentTest = 0;

    ws.on('open', async () => {
      log('green', '✅ Connected to Gateway\n');

      // 定义测试用例
      const testCases = [
        {
          name: '获取所有扩展',
          method: 'extensions.list',
          params: {},
          validate: (result) => {
            if (!result.ok) throw new Error('Response not ok');
            if (!result.payload?.extensions) throw new Error('No extensions in payload');
            if (result.payload.extensions.length === 0) throw new Error('Empty extensions list');
            log('green', `   ✓ 找到 ${result.payload.extensions.length} 个扩展`);
            return true;
          },
        },
        {
          name: '安装扩展',
          method: 'extensions.install',
          params: {
            extensionId: 'ext-github-001',
            userId: TEST_USER_ID,
          },
          validate: (result) => {
            if (!result.ok) throw new Error(`Install failed: ${result.payload?.message}`);
            log('green', '   ✓ 扩展安装成功');
            return true;
          },
        },
        {
          name: '获取已安装扩展',
          method: 'extensions.installed',
          params: { userId: TEST_USER_ID },
          validate: (result) => {
            if (!result.ok) throw new Error('Response not ok');
            if (!result.payload?.extensions) throw new Error('No extensions in payload');
            log('green', `   ✓ 用户已安装 ${result.payload.extensions.length} 个扩展`);
            return true;
          },
        },
        {
          name: '禁用扩展',
          method: 'extensions.disable',
          params: {
            extensionId: 'ext-github-001',
            userId: TEST_USER_ID,
          },
          validate: (result) => {
            if (!result.ok) throw new Error('Disable failed');
            log('green', '   ✓ 扩展已禁用');
            return true;
          },
        },
        {
          name: '启用扩展',
          method: 'extensions.enable',
          params: {
            extensionId: 'ext-github-001',
            userId: TEST_USER_ID,
          },
          validate: (result) => {
            if (!result.ok) throw new Error('Enable failed');
            log('green', '   ✓ 扩展已启用');
            return true;
          },
        },
        {
          name: '卸载扩展',
          method: 'extensions.uninstall',
          params: {
            extensionId: 'ext-github-001',
            userId: TEST_USER_ID,
          },
          validate: (result) => {
            if (!result.ok) throw new Error('Uninstall failed');
            log('green', '   ✓ 扩展已卸载');
            return true;
          },
        },
      ];

      // 执行测试
      for (const testCase of testCases) {
        try {
          log('blue', `\n📝 Test: ${testCase.name}`);
          
          const result = await sendRequest(ws, testCase.method, testCase.params);
          testCase.validate(result);
          tests.push({ name: testCase.name, passed: true });
        } catch (error) {
          log('red', `   ✗ ${error.message}`);
          tests.push({ name: testCase.name, passed: false, error: error.message });
        }
      }

      // 打印测试结果
      log('cyan', '\n\n📊 Test Results Summary:');
      log('cyan', '═'.repeat(50));
      
      const passed = tests.filter(t => t.passed).length;
      const failed = tests.filter(t => !t.passed).length;
      
      tests.forEach((test, index) => {
        const status = test.passed ? '✓' : '✗';
        const color = test.passed ? 'green' : 'red';
        log(color, `${status} ${index + 1}. ${test.name}`);
        if (!test.passed) {
          log('red', `   Error: ${test.error}`);
        }
      });
      
      log('cyan', '═'.repeat(50));
      log('yellow', `\nTotal: ${tests.length} | Passed: ${passed} | Failed: ${failed}\n`);
      
      if (failed === 0) {
        log('green', '🎉 All tests passed!\n');
      } else {
        log('red', `⚠️  ${failed} test(s) failed\n`);
      }

      ws.close();
      resolve(tests);
    });

    ws.on('error', (error) => {
      log('red', `❌ WebSocket error: ${error.message}`);
      log('yellow', '💡 Make sure the Gateway server is running on port 3001');
      reject(error);
    });

    ws.on('close', () => {
      log('cyan', 'Connection closed\n');
    });
  });
}

function sendRequest(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const request = createRequest(id, method, params);
    
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout: ${method}`));
    }, 5000);

    const handler = (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === id) {
          clearTimeout(timeout);
          ws.removeListener('message', handler);
          resolve(response);
        }
      } catch (error) {
        // Ignore parse errors for non-response messages
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify(request));
  });
}

// 运行测试
if (require.main === module) {
  testExtensionsAPI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testExtensionsAPI };
