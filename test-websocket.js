const WebSocket = require('ws');

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ WebSocket connected to port 3001');
  
  // Send authentication message (mock JWT token)
  const authMessage = {
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  };
  
  ws.send(JSON.stringify(authMessage));
  console.log('📤 Sent auth message');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', JSON.stringify(message, null, 2));
  
  // Check for hermes events
  if (message.event === 'hermes.delta') {
    process.stdout.write(message.data.delta);
  } else if (message.event === 'hermes.final') {
    console.log('\n\n✅ Stream completed!');
    console.log('Total tokens:', message.data.totalTokens);
    ws.close();
  } else if (message.event === 'hermes.error') {
    console.log('\n❌ Error:', message.data.error);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Wait a bit for auth to complete, then send a test message
setTimeout(() => {
  console.log('\n📤 Sending test message to Hermes...');
  
  const rpcMessage = {
    type: 'rpc',
    method: 'hermes.send',
    params: {
      sessionId: 'test-session-123',
      message: 'Hello! Can you tell me about NestJS?'
    },
    id: 'test-rpc-1'
  };
  
  ws.send(JSON.stringify(rpcMessage));
}, 1000);

ws.on('close', () => {
  console.log('\n🔌 WebSocket connection closed');
  process.exit(0);
});
