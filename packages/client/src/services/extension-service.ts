/**
 * Extension Service - 扩展商店服务层
 *
 * 提供扩展浏览、安装、卸载等功能的API调用封装
 */

import { getServiceContainer } from './service-container';
import type { Extension } from '@/stores/extensions';

export class ExtensionService {
  private getClient() {
    return getServiceContainer().gatewayClient;
  }

  /**
   * 获取所有可用扩展
   */
  async getAllExtensions(): Promise<Extension[]> {
    try {
      const result = await this.getClient().send('extensions.list', {});
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
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
      const result = await this.getClient().send('extensions.installed', { userId });
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
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
      await this.getClient().send('extensions.install', { extensionId, userId, config });
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
      await this.getClient().send('extensions.uninstall', { extensionId, userId });
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
      await this.getClient().send('extensions.enable', { extensionId, userId });
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
      await this.getClient().send('extensions.disable', { extensionId, userId });
    } catch (error) {
      console.error('Error disabling extension:', error);
      throw error;
    }
  }

  /**
   * 更新扩展配置
   */
  async updateExtensionConfig(extensionId: string, userId: string, config: any): Promise<void> {
    try {
      await this.getClient().send('extensions.updateConfig', { extensionId, userId, config });
    } catch (error) {
      console.error('Error updating extension config:', error);
      throw error;
    }
  }
}
