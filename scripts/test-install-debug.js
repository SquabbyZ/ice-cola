/**
 * Debug Test for Extension Installation
 */

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://localhost:3001/gateway';

console.log('\n🔍 Debugging Extension Install API...\n');

const ws = new WebSocket(GATEWAY_URL);

ws.on('open', () => {
  console.log('✅ Connected to Gateway\n');
  
  // Test install with detailed logging
  const id = `debug-${Date.now()}`;
  const request = {
    type: 'req',
    id,
    method: 'extensions.install',
    params: {
      extensionId: 'ext-github-001',
      userId: 'test-user-001'
    }
  };
  
  console.log('📤 Sending request:');
  console.log(JSON.stringify(request, null, 2));
  console.log();
  
  const timeout = setTimeout(() => {
    console.log('❌ Request timeout');
    process.exit(1);
  }, 5000);
  
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      if (response.id === id) {
        clearTimeout(timeout);
        
        console.log('📥 Received response:');
        console.log(JSON.stringify(response, null, 2));
        console.log();
        
        if (response.ok) {
          console.log('✅ Installation successful!');
        } else {
          console.log('❌ Installation failed');
          console.log('Error details:', response.error || response.payload);
        }
        
        ws.close();
        process.exit(response.ok ? 0 : 1);
      }
    } catch (error) {
      console.error('Parse error:', error.message);
    }
  });
  
  ws.send(JSON.stringify(request));
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});
