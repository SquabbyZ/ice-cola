/**
 * API Key Service - 通过 Gateway Secrets 管理 API Keys
 * 
 * 使用 OpenClaw Gateway 的 secrets 系统安全存储和管理 API Keys
 */

import { GatewayRpcService } from '../services/gateway-rpc';
import { invoke } from '@tauri-apps/api/core';

export interface ApiKeyEntry {
  provider: string;
  key: string;
  name?: string;
  isActive?: boolean;
}

export class ApiKeyService {
  private rpc: GatewayRpcService;
  private restartUnlisten: (() => void) | null = null;

  constructor(rpc: GatewayRpcService) {
    this.rpc = rpc;

    // 监听 config-changed 事件，自动重启 Gateway
    this.setupConfigChangedListener();
  }

  /**
   * 设置 config-changed 事件监听器
   */
  private setupConfigChangedListener(): void {
    // 防止重复监听
    if (this.restartUnlisten) {
      return;
    }

    console.log('🔔 Setting up config-changed listener for auto-restart');
    this.restartUnlisten = this.rpc.on('config-changed', async (data) => {
      console.log('🔔 Received config-changed event:', data);
      console.log('🔄 Attempting to restart Gateway...');

      try {
        // 直接调用 Tauri invoke，确保在 Tauri 上下文中
        if (typeof window !== 'undefined' && (window as any).__TAURI_INVOKE__) {
          await (window as any).__TAURI_INVOKE__('restart_gateway');
          console.log('✅ Gateway restarted successfully via config-changed event!');
        } else if (typeof invoke !== 'undefined') {
          // 尝试直接调用 invoke（可能已绑定到 window）
          await invoke('restart_gateway');
          console.log('✅ Gateway restarted successfully via invoke!');
        } else {
          console.log('ℹ️ Gateway restart not available - running in browser context');
        }
      } catch (error) {
        console.warn('⚠️ Gateway restart failed (non-critical):', error);
      }
    });
  }

  /**
   * 保存 API Key 到 Gateway Secrets
   * @param provider 提供商名称 (minimax, openai, anthropic 等)
   * @param apiKey API Key 值
   * @param name 可选的名称标识
   */
  async saveApiKey(provider: string, apiKey: string, _name?: string): Promise<void> {
    try {
      console.log(`📝 Saving API Key for ${provider}...`);
      console.log(`   Provider: ${provider}`);
      console.log(`   API Key length: ${apiKey.length} chars`);
      
      // ⚠️ 关键修复：config.patch 的 restoreRedactedValues 会用旧值覆盖新值
      // 导致 Gateway 认为是 noop，不触发重启
      // 
      // 解决方案：直接写入配置文件，绕过 config.patch 的脱敏恢复机制
      // 然后通过 Tauri 命令重启 Gateway
      
      // 读取当前配置文件
      const currentConfig = await this.rpc.send('config.get');
      const configPath = currentConfig?.path || 'C:\\Users\\smallMark\\.openclaw\\openclaw.json';
      
      // 构造完整的配置（保留所有现有配置）
      const fullConfig = currentConfig?.parsed || {};
      
      // 更新 API Key
      if (!fullConfig.models) fullConfig.models = {};
      if (!fullConfig.models.providers) fullConfig.models.providers = {};
      
      fullConfig.models.providers[provider] = {
        ...fullConfig.models.providers[provider],
        apiKey: apiKey,  // 直接设置新的 API Key
        baseUrl: fullConfig.models.providers[provider]?.baseUrl || (provider === 'minimax' ? 'https://api.minimax.io/anthropic' : ''),
      };
      
      console.log(`   Writing config to: ${configPath}`);
      console.log(`   Provider config:`, JSON.stringify(fullConfig.models.providers[provider], null, 2).substring(0, 200) + '...');
      
      // 使用 config.set 而不是 config.patch（config.set 不会恢复脱敏值，会直接覆盖）
      // Gateway 会在写入配置后发送 config-changed 事件，触发自动重启
      const result = await this.rpc.send('config.set', {
        raw: JSON.stringify(fullConfig, null, 2),
        baseHash: currentConfig.hash,  // config.set 也需要 baseHash
      });

      console.log(`✅ API Key saved for ${provider}`);
      console.log(`   Config set result:`, result);

      // 注意：Gateway 会自动发送 config-changed 事件触发重启
      // 重启逻辑在 setupConfigChangedListener 中处理
    } catch (error) {
      console.error(`❌ Failed to save API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 获取 API Key（仅检查是否存在，不返回实际值）
   * @param provider 提供商名称
   * @returns 是否已配置
   */
  async hasApiKey(provider: string): Promise<boolean> {
    try {
      const response = await this.rpc.send('config.get');
      
      // Gateway 返回的是复杂对象，需要检查多个可能的路径
      // 路径1: response.config.models.providers[provider] (最终合并配置)
      const config1 = response?.config?.models?.providers?.[provider];
      
      // 路径2: response.parsed.models.providers[provider] (解析后的配置)
      const config2 = response?.parsed?.models?.providers?.[provider];
      
      // 路径3: response.runtimeConfig.models.providers[provider] (运行时配置)
      const config3 = response?.runtimeConfig?.models?.providers?.[provider];
      
      // 只要任一路径存在且有效，就认为已配置
      const hasConfig = (
        (config1 !== undefined && config1 !== null) ||
        (config2 !== undefined && config2 !== null) ||
        (config3 !== undefined && config3 !== null)
      );
      
      console.log(`🔍 hasApiKey(${provider}):`, hasConfig, {
        path1: !!config1,
        path2: !!config2,
        path3: !!config3
      });
      
      return hasConfig;
    } catch (error) {
      console.error(`Failed to check API key for ${provider}:`, error);
      return false;
    }
  }

  /**
   * 删除 API Key
   * @param provider 提供商名称
   */
  async deleteApiKey(provider: string): Promise<void> {
    try {
      const secretPath = `/models/providers/${provider}/apiKey`;
      
      await this.rpc.send('config.patch', {
        patches: [
          {
            op: 'remove',
            path: secretPath,
          },
        ],
      });

      console.log(`✅ API Key deleted for ${provider}`);
    } catch (error) {
      console.error(`Failed to delete API key for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * 测试 API Key 是否有效
   * @param provider 提供商名称
   * @returns 是否有效
   */
  async testApiKey(provider: string): Promise<{ valid: boolean; error?: string; detail?: string }> {
    try {
      // 第一步：验证 API Key 是否已保存
      const hasKey = await this.hasApiKey(provider);
      if (!hasKey) {
        return { 
          valid: false, 
          error: 'API Key Not Found',
          detail: 'API Key 未保存，请先保存后再测试'
        };
      }

      // 第二步：通过发送一条测试消息来真正验证 API Key
      // 使用最小的会话发送测试消息
      const testSessionKey = `api-key-test-${Date.now()}`;
      const testIdempotencyKey = `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      
      try {
        const response = await this.rpc.send('chat.send', {
          sessionKey: testSessionKey,
          message: 'Hi',
          idempotencyKey: testIdempotencyKey,
        });
        
        // 如果成功发送并收到响应，说明 API Key 有效
        if (response && (response.text || response.runId)) {
          return { 
            valid: true,
            detail: 'API Key 验证成功'
          };
        }
        
        return { 
          valid: false, 
          error: 'Invalid response',
          detail: '响应格式异常'
        };
      } catch (chatError: any) {
        const errorMsg = chatError.message || String(chatError);
        
        // 检查是否是认证错误
        if (errorMsg.includes('401') || errorMsg.includes('authentication') || errorMsg.includes('invalid api key')) {
          return {
            valid: false,
            error: 'Authentication Failed',
            detail: 'API Key 无效或已过期，请检查后重新输入'
          };
        }
        
        // 其他错误（可能是网络问题等）
        return {
          valid: false,
          error: 'Test Failed',
          detail: `测试失败: ${errorMsg}`
        };
      }
    } catch (error: any) {
      // 判断错误类型
      const errorMsg = error.message || String(error);
      
      if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        return {
          valid: false,
          error: 'Request Timeout',
          detail: '请求超时，可能是网络问题或 Gateway 未正确配置'
        };
      }
      
      return { 
        valid: false, 
        error: errorMsg,
        detail: '连接测试失败'
      };
    }
  }

  /**
   * 获取所有已配置的提供商
   * @returns 提供商列表
   */
  async getConfiguredProviders(): Promise<string[]> {
    try {
      const config = await this.rpc.send('config.get');
      const providers = config?.providers || {};
      
      return Object.keys(providers).filter(provider => {
        const apiKey = this.getNestedValue(providers[provider], 'apiKey');
        return apiKey !== undefined && apiKey !== '';
      });
    } catch (error) {
      console.error('Failed to get configured providers:', error);
      return [];
    }
  }

  /**
   * 辅助方法：获取嵌套对象值
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
}
