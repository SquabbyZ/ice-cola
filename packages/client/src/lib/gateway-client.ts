/**
 * Gateway 客户端单例
 *
 * 统一从 ServiceContainer 获取，确保全局只有一个连接实例。
 * 连接生命周期由 useGateway hook 管理（等待 gateway-ready 事件后连接）。
 */

import { getServiceContainer } from '@/services/service-container';

export const gatewayClient = getServiceContainer().gatewayClient;
