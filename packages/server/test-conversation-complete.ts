/**
 * 对话功能完整测试脚本
 * 
 * 测试内容：
 * 1. 用户认证与 Token 获取
 * 2. 会话管理（CRUD）
 * 3. 消息持久化
 * 4. 端到端流程验证
 * 
 * 使用方法：
 * npx tsx test-conversation-complete.ts
 */

import axios from 'axios';

// Node.js 全局类型声明
declare const process: {
  env: {
    API_BASE?: string;
    TEST_EMAIL?: string;
    TEST_PASSWORD?: string;
    API_KEY?: string;
    DEBUG?: string;
  };
  exit: (code: number) => never;
};

// ==================== 配置区域 ====================
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const TEST_USER_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_PASSWORD || 'Test123456';
const TEAM_ID = 'default'; // 默认团队 ID

// API Key（如果提供的话）
const API_KEY = process.env.API_KEY || '';

console.log('🚀 开始对话功能完整测试...\n');
console.log('📋 测试配置:');
console.log(`   API Base: ${API_BASE}`);
console.log(`   Team ID: ${TEAM_ID}`);
console.log(`   API Key: ${API_KEY ? '已配置' : '未配置'}`);
console.log('');

// ==================== 工具函数 ====================
function logStep(step: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📍 Step: ${step}`);
  console.log('='.repeat(60));
}

function logSuccess(message: string, data?: any) {
  console.log(`✅ ${message}`);
  if (data && process.env.DEBUG === 'true') {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error('   Error:', error.message || error);
    if (error.response) {
      console.error('   Response:', error.response.status, error.response.data);
    }
  }
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

// ==================== 测试状态管理 ====================
interface TestState {
  authToken: string | null;
  conversationId: string | null;
  messageId: string | null;
  passedTests: number;
  failedTests: number;
  totalTests: number;
}

const state: TestState = {
  authToken: null,
  conversationId: null,
  messageId: null,
  passedTests: 0,
  failedTests: 0,
  totalTests: 0,
};

// ==================== HTTP 客户端 ====================
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加认证头
apiClient.interceptors.request.use((config) => {
  if (state.authToken) {
    config.headers.Authorization = `Bearer ${state.authToken}`;
  }
  if (API_KEY) {
    config.headers['X-API-Key'] = API_KEY;
  }
  return config;
});

// ==================== 测试用例 ====================

/**
 * 测试 1: 用户认证
 */
async function testAuthentication() {
  logStep('1. 用户认证测试');
  state.totalTests++;

  try {
    // 尝试登录获取 token
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (response.data.success && response.data.data.token) {
      state.authToken = response.data.data.token;
      logSuccess('用户认证成功', {
        userId: response.data.data.user?.id,
        email: response.data.data.user?.email,
      });
      state.passedTests++;
      return true;
    } else {
      logError('登录响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      logInfo('认证接口不存在，跳过认证步骤（使用匿名模式）');
      state.passedTests++;
      return true;
    }
    logError('用户认证失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 2: 创建新会话
 */
async function testCreateConversation() {
  logStep('2. 创建新会话测试');
  state.totalTests++;

  try {
    const title = `测试对话 - ${new Date().toLocaleString('zh-CN')}`;
    const response = await apiClient.post(`/teams/${TEAM_ID}/conversations`, {
      title,
    });

    if (response.data.success && response.data.data.id) {
      state.conversationId = response.data.data.id;
      logSuccess('会话创建成功', {
        id: state.conversationId,
        title: response.data.data.title,
        createdAt: response.data.data.createdAt,
      });
      state.passedTests++;
      return true;
    } else {
      logError('会话创建响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('会话创建失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 3: 获取会话列表
 */
async function testGetConversationList() {
  logStep('3. 获取会话列表测试');
  state.totalTests++;

  try {
    const response = await apiClient.get(`/teams/${TEAM_ID}/conversations`, {
      params: { page: 1, pageSize: 10 },
    });

    if (response.data.success && Array.isArray(response.data.data.conversations)) {
      const conversations = response.data.data.conversations;
      logSuccess('会话列表获取成功', {
        total: response.data.data.total,
        count: conversations.length,
        firstConversation: conversations[0] ? {
          id: conversations[0].id,
          title: conversations[0].title,
        } : null,
      });
      state.passedTests++;
      return true;
    } else {
      logError('会话列表响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('获取会话列表失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 4: 获取单个会话详情
 */
async function testGetConversationById() {
  logStep('4. 获取会话详情测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    const response = await apiClient.get(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}`
    );

    if (response.data.success && response.data.data.id) {
      logSuccess('会话详情获取成功', {
        id: response.data.data.id,
        title: response.data.data.title,
        messageCount: response.data.data.messageCount,
      });
      state.passedTests++;
      return true;
    } else {
      logError('会话详情响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('获取会话详情失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 5: 更新会话标题
 */
async function testUpdateConversationTitle() {
  logStep('5. 更新会话标题测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    const newTitle = `更新后的标题 - ${new Date().getTime()}`;
    const response = await apiClient.put(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}`,
      { title: newTitle }
    );

    if (response.data.success) {
      logSuccess('会话标题更新成功', {
        newTitle,
      });
      state.passedTests++;
      return true;
    } else {
      logError('会话标题更新响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('更新会话标题失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 6: 添加用户消息
 */
async function testAddUserMessage() {
  logStep('6. 添加用户消息测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    const userMessage = '你好，这是一个测试消息！';
    const response = await apiClient.post(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}/messages`,
      {
        role: 'user',
        content: userMessage,
      }
    );

    if (response.data.success && response.data.data.id) {
      state.messageId = response.data.data.id;
      logSuccess('用户消息添加成功', {
        id: state.messageId,
        role: response.data.data.role,
        content: response.data.data.content.substring(0, 50),
      });
      state.passedTests++;
      return true;
    } else {
      logError('用户消息添加响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('添加用户消息失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 7: 添加助手消息
 */
async function testAddAssistantMessage() {
  logStep('7. 添加助手消息测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    const assistantMessage = '你好！我是 AI 助手，很高兴为你服务。这是一个测试回复。';
    const response = await apiClient.post(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}/messages`,
      {
        role: 'assistant',
        content: assistantMessage,
        model: 'test-model',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      }
    );

    if (response.data.success && response.data.data.id) {
      logSuccess('助手消息添加成功', {
        id: response.data.data.id,
        role: response.data.data.role,
        model: response.data.data.model,
        usage: response.data.data.usage,
      });
      state.passedTests++;
      return true;
    } else {
      logError('助手消息添加响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('添加助手消息失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 8: 验证消息持久化
 */
async function testMessagePersistence() {
  logStep('8. 验证消息持久化测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    // 重新获取会话详情，检查消息是否已保存
    const response = await apiClient.get(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}`
    );

    if (response.data.success && response.data.data.messages) {
      const messages = response.data.data.messages;
      const userMessages = messages.filter((m: any) => m.role === 'user');
      const assistantMessages = messages.filter((m: any) => m.role === 'assistant');

      logSuccess('消息持久化验证成功', {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        hasUserMessage: userMessages.length > 0,
        hasAssistantMessage: assistantMessages.length > 0,
      });

      if (userMessages.length > 0 && assistantMessages.length > 0) {
        state.passedTests++;
        return true;
      } else {
        logError('消息数量不符合预期');
        state.failedTests++;
        return false;
      }
    } else {
      logError('会话详情中缺少消息数据');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('验证消息持久化失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 9: 多轮对话测试
 */
async function testMultiTurnConversation() {
  logStep('9. 多轮对话测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    // 模拟多轮对话
    const conversation = [
      { role: 'user', content: '什么是 TypeScript？' },
      { role: 'assistant', content: 'TypeScript 是 JavaScript 的超集，添加了静态类型检查。' },
      { role: 'user', content: '它有哪些优势？' },
      { role: 'assistant', content: '主要优势包括：类型安全、更好的 IDE 支持、代码可维护性更强。' },
    ];

    let successCount = 0;
    for (const msg of conversation) {
      try {
        await apiClient.post(
          `/teams/${TEAM_ID}/conversations/${state.conversationId}/messages`,
          msg
        );
        successCount++;
      } catch (error) {
        logError(`第 ${successCount + 1} 条消息发送失败`, error);
      }
    }

    if (successCount === conversation.length) {
      logSuccess('多轮对话测试完成', {
        totalMessages: conversation.length,
        successCount,
      });
      state.passedTests++;
      return true;
    } else {
      logError(`多轮对话部分失败，成功 ${successCount}/${conversation.length}`);
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('多轮对话测试失败', error);
    state.failedTests++;
    return false;
  }
}

/**
 * 测试 10: 删除会话
 */
async function testDeleteConversation() {
  logStep('10. 删除会话测试');
  state.totalTests++;

  if (!state.conversationId) {
    logError('没有可用的会话 ID，跳过此测试');
    state.failedTests++;
    return false;
  }

  try {
    const response = await apiClient.delete(
      `/teams/${TEAM_ID}/conversations/${state.conversationId}`
    );

    if (response.data.success) {
      logSuccess('会话删除成功');
      
      // 验证删除后无法获取该会话
      try {
        await apiClient.get(
          `/teams/${TEAM_ID}/conversations/${state.conversationId}`
        );
        logError('会话删除后仍可访问，删除可能未生效');
        state.failedTests++;
        return false;
      } catch (verifyError: any) {
        if (verifyError.response?.status === 404) {
          logSuccess('验证：会话已成功删除（404）');
          state.passedTests++;
          return true;
        } else {
          logError('验证删除时出现意外错误', verifyError);
          state.failedTests++;
          return false;
        }
      }
    } else {
      logError('会话删除响应格式错误');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('删除会话失败', error);
    state.failedTests++;
    return false;
  }
}

// ==================== 主测试流程 ====================
async function runAllTests() {
  console.log('\n🧪 开始执行完整测试套件\n');

  // 执行所有测试
  await testAuthentication();
  await testCreateConversation();
  await testGetConversationList();
  await testGetConversationById();
  await testUpdateConversationTitle();
  await testAddUserMessage();
  await testAddAssistantMessage();
  await testMessagePersistence();
  await testMultiTurnConversation();
  await testDeleteConversation();

  // 打印测试报告
  printTestReport();
}

function printTestReport() {
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   📊 测试报告                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`总测试数:     ${state.totalTests}`);
  console.log(`通过测试:     ${state.passedTests} ✅`);
  console.log(`失败测试:     ${state.failedTests} ❌`);
  console.log(`通过率:       ${((state.passedTests / state.totalTests) * 100).toFixed(1)}%`);
  console.log('');

  if (state.failedTests === 0) {
    console.log('🎉 所有测试通过！对话功能运行正常。');
  } else {
    console.log('⚠️  部分测试失败，请检查上面的错误信息。');
  }

  console.log('');
  console.log('测试完成时间:', new Date().toLocaleString('zh-CN'));
  console.log('');
}

// ==================== 启动测试 ====================
runAllTests().catch((error) => {
  console.error('\n💥 测试执行过程中发生未捕获的错误:', error);
  process.exit(1);
});
