#!/usr/bin/env node
/**
 * 验证脚本：测试前端与 Gateway 的真实数据流
 */

const WebSocket = require('ws');

const GATEWAY_URL = 'ws://localhost:18789';

console.log('🔍 开始验证 OpenClaw Desktop 数据流...\n');

async function testRPC(method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL);
    
    ws.onopen = () => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      };
      
      console.log(`📤 发送请求: ${method}`);
      ws.send(JSON.stringify(request));
    };
    
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data.toString());
      console.log(`📥 收到响应:`, JSON.stringify(response, null, 2));
      ws.close();
      resolve(response);
    };
    
    ws.onerror = (err) => {
      console.error(`❌ 错误:`, err.message);
      reject(err);
    };
    
    setTimeout(() => {
      console.log('⏰ 超时');
      ws.close();
      reject(new Error('Timeout'));
    }, 3000);
  });
}

async function runTests() {
  try {
    // 测试 1: 获取统计信息
    console.log('\n=== 测试 1: stats.get ===');
    await testRPC('stats.get');
    
    // 测试 2: 获取聊天历史
    console.log('\n=== 测试 2: chat.history ===');
    await testRPC('chat.history', { sessionKey: 'test-session' });
    
    // 测试 3: 发送消息
    console.log('\n=== 测试 3: chat.send ===');
    await testRPC('chat.send', { content: '你好，OpenClaw！' });
    
    // 测试 4: 获取专家列表
    console.log('\n=== 测试 4: experts.list ===');
    await testRPC('experts.list');
    
    // 测试 5: 获取工具列表
    console.log('\n=== 测试 5: tools.list ===');
    await testRPC('tools.list');
    
    console.log('\n✅ 所有测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

runTests();
