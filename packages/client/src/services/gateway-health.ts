/**
 * GatewayHealthChecker - Gateway 连接健康检查器
 * 
 * 定期发送 ping 消息检测连接活性，防止半开连接（WebSocket 显示 OPEN 但实际已断开）。
 */

import { GatewayClient } from './gateway-client';

export class GatewayHealthChecker {
  private interval: ReturnType<typeof setInterval> | null = null;
  private client: GatewayClient;
  private lastPongTime: number = Date.now();
  
  // 配置常量
  private readonly PING_INTERVAL = 10000; // 每 10 秒发送一次 ping
  private readonly PONG_TIMEOUT = 5000;   // 超过 5 秒未收到 pong 则认为连接异常

  constructor(client: GatewayClient) {
    this.client = client;
  }

  /**
   * 启动健康检查
   */
  start(): void {
    if (this.interval) {
      console.warn('⚠️ Health checker already running');
      return;
    }

    console.log('🏥 Starting Gateway health checker (ping every 10s)');
    this.interval = setInterval(() => this.check(), this.PING_INTERVAL);
    
    // 立即执行一次检查
    this.check().catch(() => {
      // 忽略首次检查错误
    });
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.interval) {
      console.log('🛑 Stopping Gateway health checker');
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * 执行健康检查
   */
  private async check(): Promise<void> {
    // 如果客户端未连接，跳过检查
    if (!this.client.isConnected()) {
      return;
    }

    const now = Date.now();
    
    // 检查是否超过 pong 超时时间
    if (now - this.lastPongTime > this.PONG_TIMEOUT) {
      console.warn('⚠️ Gateway health check failed: no pong received in time, forcing reconnect');
      this.client.disconnect();
      return;
    }

    // 发送 ping 消息
    try {
      await this.client.send('ping', {});
      this.lastPongTime = Date.now();
      console.log('💓 Gateway health check passed');
    } catch (error) {
      console.error('❌ Health check ping failed:', error);
      // ping 失败，断开连接触发重连
      this.client.disconnect();
    }
  }

  /**
   * 记录 pong 响应（由 GatewayClient 调用）
   */
  recordPong(): void {
    this.lastPongTime = Date.now();
  }
}
