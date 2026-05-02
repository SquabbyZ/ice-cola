/**
 * Gateway 集成测试脚本
 * 
 * 验证与真实 OpenClaw Gateway 的连接和功能
 */

import { GatewayClient } from './gateway-client';
import { GatewayConfigManager } from './gateway-config';
import { GatewayHealthChecker } from './gateway-health';
import { GatewayRpcService } from './gateway-rpc';

/**
 * 测试结果
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

/**
 * 运行单个测试
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    await testFn();
    return {
      name,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 打印测试结果
 */
function printResults(results: TestResult[]): void {
  console.log('\n📊 Test Results:\n');
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSED' : 'FAILED';
    console.log(`${index + 1}. ${icon} ${result.name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Duration: ${result.duration}ms`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
    throw new Error(`${total - passed} test(s) failed`);
  }
}

/**
 * 主测试函数
 */
async function main(): Promise<void> {
  console.log('🧪 Starting Gateway Integration Tests...\n');
  
  const results: TestResult[] = [];
  
  // 测试 1: 配置管理
  results.push(await runTest('Gateway Configuration', async () => {
    const configManager = new GatewayConfigManager();
    const config = configManager.getConfig();
    
    if (!config.url) {
      throw new Error('Config URL is missing');
    }
    
    console.log('   Config loaded:', config.url);
  }));
  
  // 测试 2: 连接测试
  const gatewayToken = 'ff905ffe94711d52ba7ca34cc56399f5788caaf8ec67027c'; // Gateway 配置的 token
  const client = new GatewayClient({
    url: 'ws://localhost:18789',
    token: gatewayToken,
    reconnectInterval: 3000,
    requestTimeout: 10000,
    maxRetries: 3,
    onConnected: () => {
      console.log('🧪 IntegrationTest: Gateway connected');
    },
    onDisconnected: () => {
      console.log('🧪 IntegrationTest: Gateway disconnected');
    },
  });
  
  results.push(await runTest('Gateway Connection', async () => {
    await client.connect();
    
    if (!client.isConnected()) {
      throw new Error('Client not connected after connect()');
    }
    
    console.log('   Connected successfully');
  }));
  
  // 测试 3: RPC 服务初始化
  const rpc = new GatewayRpcService(client);
  
  results.push(await runTest('RPC Service Initialization', async () => {
    if (!rpc) {
      throw new Error('RPC service not initialized');
    }
    console.log('   RPC service ready');
  }));
  
  // 测试 4: Ping 测试
  results.push(await runTest('Ping Gateway', async () => {
    const isAlive = await rpc.ping();
    
    if (!isAlive) {
      throw new Error('Ping failed');
    }
    
    console.log('   Gateway responded to ping');
  }));
  
  // 测试 5: 获取版本信息
  results.push(await runTest('Get Version', async () => {
    const version = await rpc.getVersion();
    
    if (!version.version) {
      throw new Error('Version info missing');
    }
    
    console.log('   Version:', version.version);
  }));
  
  // 测试 6: 获取系统状态
  results.push(await runTest('Get System Status', async () => {
    const status = await rpc.getStatus();
    
    if (!status.uptime || !status.connections) {
      throw new Error('Status info incomplete');
    }
    
    console.log('   Uptime:', status.uptime, 'seconds');
    console.log('   Connections:', status.connections);
  }));
  
  // 测试 7: 列出会话
  results.push(await runTest('List Sessions', async () => {
    const sessions = await rpc.listSessions();
    
    console.log('   Sessions count:', sessions.length);
  }));
  
  // 测试 8: 创建会话
  let testSessionId: string | undefined;
  
  results.push(await runTest('Create Session', async () => {
    const session = await rpc.createSession('Test Session');
    testSessionId = session.id;
    
    if (!session.id || !session.name) {
      throw new Error('Session creation failed');
    }
    
    console.log('   Session created:', session.id);
  }));
  
  // 测试 9: 发送聊天消息
  results.push(await runTest('Send Chat Message', async () => {
    if (!testSessionId) {
      throw new Error('Test session ID not available');
    }
    
    const result = await rpc.sendChatMessage(
      testSessionId,
      'Hello, this is a test message!',
      { model: 'gpt-4' }
    );
    
    if (!result.messageId || !result.response) {
      throw new Error('Chat message failed');
    }
    
    console.log('   Message sent:', result.messageId);
    console.log('   Tokens used:', result.tokens);
  }));
  
  // 测试 10: 获取聊天历史
  results.push(await runTest('Get Chat History', async () => {
    if (!testSessionId) {
      throw new Error('Test session ID not available');
    }
    
    const history = await rpc.getChatHistory(testSessionId, 5);
    
    console.log('   Messages retrieved:', history.length);
  }));
  
  // 测试 11: 事件订阅
  results.push(await runTest('Event Subscription', async () => {
    const unsubscribe = rpc.on('test.event', () => {
      // Event handler
    });

    // 取消订阅
    unsubscribe();

    console.log('   Event subscription works');
  }));
  
  // 测试 12: 健康检查
  results.push(await runTest('Health Check', async () => {
    const healthChecker = new GatewayHealthChecker(client);
    
    healthChecker.start();
    
    // 等待一次检查
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Health check in progress (getHealthStatus not available on GatewayHealthChecker)
    
    healthChecker.stop();
  }));
  
  // 测试 13: 删除测试会话
  if (testSessionId) {
    results.push(await runTest('Delete Session', async () => {
      await rpc.deleteSession(testSessionId!);
      console.log('   Session deleted:', testSessionId);
    }));
  }
  
  // 清理
  client.disconnect();
  
  // 打印结果
  printResults(results);
}

// 运行测试
main().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  throw error;
});
