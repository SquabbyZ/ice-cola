/**
 * Gateway 配置管理
 * 
 * 负责:
 * 1. 读取和存储 Gateway 配置
 * 2. 提供默认配置
 * 3. 支持运行时配置更新
 */

import { GatewayConfig } from './gateway-client';

/**
 * Gateway 配置接口 (包含额外元数据)
 */
export interface GatewayConfigWithMeta extends GatewayConfig {
  name?: string;           // 配置名称
  isDefault?: boolean;     // 是否为默认配置
  lastConnected?: Date;    // 最后连接时间
}

/**
 * Gateway 配置管理器
 */
export class GatewayConfigManager {
  private static readonly STORAGE_KEY = 'openclaw_gateway_config';
  private config: GatewayConfigWithMeta;

  /**
   * 构造函数
   * @param initialConfig 初始配置 (可选)
   */
  constructor(initialConfig?: Partial<GatewayConfigWithMeta>) {
    this.config = this.loadConfig();
    
    // 合并初始配置
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): GatewayConfigWithMeta {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param updates 配置更新
   */
  updateConfig(updates: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * 测试连接
   * 
   * @returns Promise,连接成功时 resolve
   */
  async testConnection(): Promise<boolean> {
    try {
      const ws = new WebSocket(this.buildWsUrl());
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * 构建 WebSocket URL (包含 token)
   */
  buildWsUrl(): string {
    if (this.config.token) {
      return `${this.config.url}?token=${encodeURIComponent(this.config.token)}`;
    }
    return this.config.url;
  }

  /**
   * 标记最后连接时间
   */
  markConnected(): void {
    this.config.lastConnected = new Date();
    this.saveConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): GatewayConfigWithMeta {
    try {
      const stored = localStorage.getItem(GatewayConfigManager.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...this.getDefaultConfig(),
          ...parsed,
          lastConnected: parsed.lastConnected ? new Date(parsed.lastConnected) : undefined,
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Gateway config:', error);
    }

    return this.getDefaultConfig();
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(
        GatewayConfigManager.STORAGE_KEY,
        JSON.stringify(this.config)
      );
    } catch (error) {
      console.error('❌ Failed to save Gateway config:', error);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): GatewayConfigWithMeta {
    return {
      name: 'Local Gateway',
      url: 'ws://localhost:3001',
      token: undefined,
      reconnectInterval: 3000,
      requestTimeout: 30000,
      maxRetries: 5,
      isDefault: true,
    };
  }
}
