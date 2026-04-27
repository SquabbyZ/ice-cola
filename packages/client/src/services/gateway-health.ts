/**
 * Gateway 健康检查
 * 
 * 负责:
 * 1. 定期检查 Gateway 连接状态
 * 2. 发送 ping/pong 心跳
 * 3. 报告健康状态
 */

import { GatewayClient } from './gateway-client';

/**
 * Gateway 健康状态
 */
export interface GatewayHealthStatus {
  isConnected: boolean;
  lastPing?: Date;
  latency?: number;     // 延迟 (ms)
  status: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  interval: number;      // 检查间隔 (ms)
  timeout: number;       // 超时时间 (ms)
  maxFailures: number;   // 最大失败次数
}

/**
 * Gateway 健康检查器
 */
export class GatewayHealthChecker {
  private client: GatewayClient;
  private config: HealthCheckConfig;
  private healthStatus: GatewayHealthStatus;
  private checkInterval?: number;
  private consecutiveFailures: number = 0;

  /**
   * 构造函数
   * @param client Gateway 客户端
   * @param config 健康检查配置
   */
  constructor(
    client: GatewayClient,
    config?: Partial<HealthCheckConfig>
  ) {
    this.client = client;
    this.config = {
      interval: 30000,    // 默认 30 秒
      timeout: 5000,      // 默认 5 秒超时
      maxFailures: 3,     // 默认 3 次失败
      ...config,
    };

    this.healthStatus = {
      isConnected: false,
      status: 'unhealthy',
    };
  }

  /**
   * 开始健康检查
   */
  start(): void {
    if (this.checkInterval) {
      console.warn('⚠️ Health check already started');
      return;
    }

    console.log('🏥 Starting Gateway health check...');
    
    // 立即执行一次检查
    this.performHealthCheck();

    // 设置定期检查
    this.checkInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('🏥 Stopped Gateway health check');
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealthStatus(): GatewayHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      // 检查连接状态
      if (!this.client.isConnected()) {
        this.handleFailure('Not connected');
        return;
      }

      // 发送 ping 请求测试延迟
      await this.sendPing();

      // 成功
      const latency = Date.now() - startTime;
      this.handleSuccess(latency);
    } catch (error) {
      this.handleFailure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * 发送 ping 请求
   */
  private async sendPing(): Promise<void> {
    try {
      // 使用 system.ping 方法 (如果 Gateway 支持)
      // 或者简单地检查连接状态
      await Promise.race([
        this.client.send('system.ping'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), this.config.timeout)
        ),
      ]);
    } catch (error) {
      // 如果 system.ping 不支持,忽略错误
      console.debug('Ping method not supported or failed:', error);
    }
  }

  /**
   * 处理成功
   * @param latency 延迟 (ms)
   */
  private handleSuccess(latency: number): void {
    this.consecutiveFailures = 0;
    this.healthStatus = {
      isConnected: true,
      lastPing: new Date(),
      latency,
      status: this.determineStatus(latency),
    };

    console.debug(`✅ Health check passed (latency: ${latency}ms)`);
  }

  /**
   * 处理失败
   * @param reason 失败原因
   */
  private handleFailure(reason: string): void {
    this.consecutiveFailures++;
    
    this.healthStatus = {
      isConnected: this.client.isConnected(),
      lastPing: this.healthStatus.lastPing,
      latency: this.healthStatus.latency,
      status: 'unhealthy',
    };

    console.warn(`❌ Health check failed (${this.consecutiveFailures}/${this.config.maxFailures}): ${reason}`);

    // 如果连续失败次数达到阈值,触发重连
    if (this.consecutiveFailures >= this.config.maxFailures) {
      console.error('🔄 Max failures reached, attempting reconnection...');
      this.triggerReconnection();
    }
  }

  /**
   * 根据延迟确定状态
   * @param latency 延迟 (ms)
   */
  private determineStatus(latency: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (latency < 100) {
      return 'healthy';
    } else if (latency < 500) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * 触发重连
   */
  private triggerReconnection(): void {
    // 重置计数器
    this.consecutiveFailures = 0;
    
    // GatewayClient 会自动处理重连
    // 这里只是记录日志
    console.log('🔄 Reconnection will be handled by GatewayClient');
  }
}
