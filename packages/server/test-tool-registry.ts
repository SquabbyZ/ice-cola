/**
 * 工具注册中心功能测试脚本
 * 
 * 使用方法:
 * 1. 确保服务器正在运行 (npm run dev)
 * 2. 运行此脚本: npx ts-node test-tool-registry.ts
 */

import axios from 'axios';

const BASE_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function testToolRegistry() {
  console.log('🧪 开始测试工具注册中心...\n');

  try {
    // 1. 获取初始统计信息
    console.log('1️⃣ 获取初始统计信息...');
    const statsResponse = await axios.get(`${BASE_URL}/api/tools/stats`);
    console.log('✅ 初始统计:', statsResponse.data.data);
    console.log();

    // 2. 注册一个新工具
    console.log('2️⃣ 注册新工具...');
    const newTool = {
      name: 'test_mcp_tool',
      description: '测试 MCP 工具',
      type: 'mcp_server',
      mcpConfig: {
        command: 'test-command',
        args: ['--test'],
        transport: 'stdio' as const,
      },
      metadata: {
        version: '1.0.0',
        author: 'Test Author',
        tags: ['test', 'mcp'],
        category: 'testing',
      },
    };

    const registerResponse = await axios.post(
      `${BASE_URL}/api/tools`,
      newTool,
    );
    console.log('✅ 工具注册成功:', registerResponse.data.data.name);
    const toolId = registerResponse.data.data.id;
    console.log(`   工具 ID: ${toolId}`);
    console.log();

    // 3. 获取工具列表
    console.log('3️⃣ 获取工具列表...');
    const listResponse = await axios.get(`${BASE_URL}/api/tools`);
    console.log(
      `✅ 找到 ${listResponse.data.pagination.total} 个工具`,
    );
    console.log(
      '   前几个工具:',
      listResponse.data.data.slice(0, 3).map((t: any) => t.name),
    );
    console.log();

    // 4. 获取特定工具
    console.log('4️⃣ 获取特定工具详情...');
    const detailResponse = await axios.get(`${BASE_URL}/api/tools/${toolId}`);
    console.log('✅ 工具详情:', {
      name: detailResponse.data.data.name,
      type: detailResponse.data.data.type,
      status: detailResponse.data.data.status,
    });
    console.log();

    // 5. 更新工具
    console.log('5️⃣ 更新工具描述...');
    const updateResponse = await axios.put(`${BASE_URL}/api/tools/${toolId}`, {
      description: '更新后的测试工具描述',
    });
    console.log(
      '✅ 更新成功:',
      updateResponse.data.data.description,
    );
    console.log();

    // 6. 切换工具状态
    console.log('6️⃣ 切换工具状态...');
    const toggleResponse = await axios.put(
      `${BASE_URL}/api/tools/${toolId}/toggle`,
    );
    console.log(
      '✅ 状态已切换为:',
      toggleResponse.data.data.status,
    );
    console.log();

    // 7. 获取分类列表
    console.log('7️⃣ 获取分类列表...');
    const categoriesResponse = await axios.get(
      `${BASE_URL}/api/tools/categories`,
    );
    console.log('✅ 可用分类:', categoriesResponse.data.data);
    console.log();

    // 8. 按类型查询工具
    console.log('8️⃣ 按类型查询工具...');
    const filteredResponse = await axios.get(
      `${BASE_URL}/api/tools?type=mcp_server`,
    );
    console.log(
      `✅ 找到 ${filteredResponse.data.pagination.total} 个 MCP 工具`,
    );
    console.log();

    // 9. 搜索工具
    console.log('9️⃣ 搜索工具...');
    const searchResponse = await axios.get(
      `${BASE_URL}/api/tools?search=test`,
    );
    console.log(
      `✅ 搜索结果: ${searchResponse.data.pagination.total} 个匹配项`,
    );
    console.log();

    // 10. 删除工具
    console.log('🔟 删除测试工具...');
    await axios.delete(`${BASE_URL}/api/tools/${toolId}`);
    console.log('✅ 工具已删除');
    console.log();

    // 11. 验证删除
    console.log('1️⃣1️⃣ 验证删除...');
    try {
      await axios.get(`${BASE_URL}/api/tools/${toolId}`);
      console.log('❌ 错误: 工具仍然存在');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✅ 确认工具已被删除');
      } else {
        throw error;
      }
    }
    console.log();

    console.log('🎉 所有测试通过！');
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    process.exit(1);
  }
}

// 运行测试
testToolRegistry().catch(console.error);
