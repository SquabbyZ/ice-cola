/**
 * Simple Extensions API Test
 * 测试扩展商店后端API
 */

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://localhost:3001/gateway';

console.log('\n🧪 Testing Extensions Backend API...\n');
console.log(`Connecting to: ${GATEWAY_URL}\n`);

const ws = new WebSocket(GATEWAY_URL);

let testCount = 0;
let passCount = 0;
let failCount = 0;

ws.on('open', () => {
  console.log('✅ Connected to Gateway\n');
  
  // Test 1: Get all extensions
  sendRequest('extensions.list', {})
    .then(result => {
      testCount++;
      if (result.ok && result.payload?.extensions) {
        console.log(`✓ Test 1 PASSED: Found ${result.payload.extensions.length} extensions`);
        passCount++;
        
        // Print extension names
        result.payload.extensions.forEach((ext, idx) => {
          console.log(`   ${idx + 1}. ${ext.name} (${ext.category}) - Rating: ${ext.rating}, Downloads: ${ext.downloads}`);
        });
      } else {
        console.log('✗ Test 1 FAILED: No extensions returned');
        failCount++;
      }
      
      // Test 2: Install an extension
      return sendRequest('extensions.install', {
        extensionId: 'ext-github-001',
        userId: 'test-user-001'
      });
    })
    .then(result => {
      testCount++;
      if (result.ok) {
        console.log('\n✓ Test 2 PASSED: Extension installed successfully');
        passCount++;
      } else {
        console.log('\n✗ Test 2 FAILED:', result.payload?.message || 'Unknown error');
        failCount++;
      }
      
      // Test 3: Get installed extensions
      return sendRequest('extensions.installed', { userId: 'test-user-001' });
    })
    .then(result => {
      testCount++;
      if (result.ok && result.payload?.extensions) {
        console.log(`✓ Test 3 PASSED: User has ${result.payload.extensions.length} installed extension(s)`);
        passCount++;
      } else {
        console.log('✗ Test 3 FAILED: No installed extensions found');
        failCount++;
      }
      
      // Test 4: Disable extension
      return sendRequest('extensions.disable', {
        extensionId: 'ext-github-001',
        userId: 'test-user-001'
      });
    })
    .then(result => {
      testCount++;
      if (result.ok) {
        console.log('✓ Test 4 PASSED: Extension disabled');
        passCount++;
      } else {
        console.log('✗ Test 4 FAILED:', result.payload?.message || 'Unknown error');
        failCount++;
      }
      
      // Test 5: Enable extension
      return sendRequest('extensions.enable', {
        extensionId: 'ext-github-001',
        userId: 'test-user-001'
      });
    })
    .then(result => {
      testCount++;
      if (result.ok) {
        console.log('✓ Test 5 PASSED: Extension enabled');
        passCount++;
      } else {
        console.log('✗ Test 5 FAILED:', result.payload?.message || 'Unknown error');
        failCount++;
      }
      
      // Test 6: Uninstall extension
      return sendRequest('extensions.uninstall', {
        extensionId: 'ext-github-001',
        userId: 'test-user-001'
      });
    })
    .then(result => {
      testCount++;
      if (result.ok) {
        console.log('✓ Test 6 PASSED: Extension uninstalled');
        passCount++;
      } else {
        console.log('✗ Test 6 FAILED:', result.payload?.message || 'Unknown error');
        failCount++;
      }
      
      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('📊 Test Results Summary:');
      console.log('='.repeat(50));
      console.log(`Total: ${testCount} | Passed: ${passCount} | Failed: ${failCount}\n`);
      
      if (failCount === 0) {
        console.log('🎉 All tests passed!\n');
      } else {
        console.log(`⚠️  ${failCount} test(s) failed\n`);
      }
      
      ws.close();
      process.exit(failCount > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Test error:', error.message);
      ws.close();
      process.exit(1);
    });
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.log('💡 Make sure the Gateway server is running on port 3001');
  process.exit(1);
});

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const request = {
      type: 'req',
      id,
      method,
      params
    };
    
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
        // Ignore parse errors
      }
    };
    
    ws.on('message', handler);
    ws.send(JSON.stringify(request));
  });
}
