/**
 * Extension Service - 扩展商店服务层
 * 
 * 提供扩展浏览、安装、卸载等功能的API调用封装
 */

import { GatewayRpcService } from './gateway-rpc';
import type { Extension } from '@/stores/extensions';

export interface ExtensionResponse {
  ok: boolean;
  extensions?: Extension[];
  message?: string;
}

export class ExtensionService {
  private rpc: GatewayRpcService;

  constructor(rpc: GatewayRpcService) {
    this.rpc = rpc;
  }

  /**
   * 获取所有可用扩展
   */
  async getAllExtensions(): Promise<Extension[]> {
    try {
      const result = await this.rpc.send('extensions.list', {});
      if (result.ok && result.payload?.extensions) {
        return result.payload.extensions;
      }
      throw new Error('Failed to fetch extensions');
    } catch (error) {
      console.error('Error fetching extensions:', error);
      throw error;
    }
  }

  /**
   * 获取用户已安装的扩展
   */
  async getInstalledExtensions(userId: string): Promise<Extension[]> {
    try {
      const result = await this.rpc.send('extensions.installed', { userId });
      if (result.ok && result.payload?.extensions) {
        return result.payload.extensions;
      }
      throw new Error('Failed to fetch installed extensions');
    } catch (error) {
      console.error('Error fetching installed extensions:', error);
      throw error;
    }
  }

  /**
   * 安装扩展
   */
  async installExtension(extensionId: string, userId: string, config?: any): Promise<void> {
    try {
      const result = await this.rpc.send('extensions.install', {
        extensionId,
        userId,
        config,
      });
      if (!result.ok) {
        throw new Error(result.payload?.message || 'Failed to install extension');
      }
    } catch (error) {
      console.error('Error installing extension:', error);
      throw error;
    }
  }

  /**
   * 卸载扩展
   */
  async uninstallExtension(extensionId: string, userId: string): Promise<void> {
    try {
      const result = await this.rpc.send('extensions.uninstall', {
        extensionId,
        userId,
      });
      if (!result.ok) {
        throw new Error(result.payload?.message || 'Failed to uninstall extension');
      }
    } catch (error) {
      console.error('Error uninstalling extension:', error);
      throw error;
    }
  }

  /**
   * 启用扩展
   */
  async enableExtension(extensionId: string, userId: string): Promise<void> {
    try {
      const result = await this.rpc.send('extensions.enable', {
        extensionId,
        userId,
      });
      if (!result.ok) {
        throw new Error(result.payload?.message || 'Failed to enable extension');
      }
    } catch (error) {
      console.error('Error enabling extension:', error);
      throw error;
    }
  }

  /**
   * 禁用扩展
   */
  async disableExtension(extensionId: string, userId: string): Promise<void> {
    try {
      const result = await this.rpc.send('extensions.disable', {
        extensionId,
        userId,
      });
      if (!result.ok) {
        throw new Error(result.payload?.message || 'Failed to disable extension');
      }
    } catch (error) {
      console.error('Error disabling extension:', error);
      throw error;
    }
  }

  /**
   * 更新扩展配置
   */
  async updateExtensionConfig(
    extensionId: string,
    userId: string,
    config: any
  ): Promise<void> {
    try {
      const result = await this.rpc.send('extensions.updateConfig', {
        extensionId,
        userId,
        config,
      });
      if (!result.ok) {
        throw new Error(result.payload?.message || 'Failed to update extension config');
      }
    } catch (error) {
      console.error('Error updating extension config:', error);
      throw error;
    }
  }
}

// 导出单例实例（可选）
let extensionServiceInstance: ExtensionService | null = null;

export function getExtensionService(rpc: GatewayRpcService): ExtensionService {
  if (!extensionServiceInstance) {
    extensionServiceInstance = new ExtensionService(rpc);
  }
  return extensionServiceInstance;
}
