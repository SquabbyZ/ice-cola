/**
 * useGateway - Gateway 连接管理 Hook
 *
 * 统一管理前端与 Gateway 的 WebSocket 通信
 * - 自动连接/重连
 * - 事件订阅管理
 * - 状态同步
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useGatewayStore } from '@/stores/gateway';
import { getServiceContainer } from '@/services/service-container';
import { onGatewayReady, onGatewayStartFailed } from '@/lib/tauri-commands';

export interface UseGatewayOptions {
  /** 自动连接 (默认 true) */
  autoConnect?: boolean;
  /** 重连间隔 (默认 3000ms) */
  reconnectInterval?: number;
  /** 最大重试次数 (默认 5) */
  maxRetries?: number;
}

export interface UseGatewayReturn {
  /** 是否已连接且握手完成 */
  isConnected: boolean;
  /** Gateway 是否正在运行 */
  isRunning: boolean;
  /** 连接中 */
  isConnecting: boolean;
  /** 最后错误 */
  error: Error | null;
  /** 发送 RPC 请求 */
  send: (method: string, params?: any) => Promise<any>;
  /** 订阅事件 */
  on: (event: string, handler: (data: any) => void) => () => void;
  /** 手动连接 */
  connect: () => Promise<void>;
  /** 手动断开 */
  disconnect: () => void;
  /** 重连 */
  reconnect: () => Promise<void>;
}

export function useGateway(options: UseGatewayOptions = {}): UseGatewayReturn {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxRetries = 5,
  } = options;

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { isRunning, setGatewayStatus } = useGatewayStore();
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualDisconnectRef = useRef(false);

  const serviceContainer = useRef(getServiceContainer());
  const gatewayClient = serviceContainer.current.gatewayClient;

  // 更新 store 状态
  const updateStatus = useCallback((running: boolean, connected: boolean) => {
    setGatewayStatus(running, connected);
  }, [setGatewayStatus]);

  // 连接 Gateway
  const connect = useCallback(async () => {
    if (gatewayClient.isConnected()) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    isManualDisconnectRef.current = false;

    try {
      await gatewayClient.connect();
      reconnectAttemptsRef.current = 0;
      updateStatus(true, true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      updateStatus(true, false);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [gatewayClient, updateStatus]);

  // 断开连接
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    gatewayClient.disconnect();
    updateStatus(false, false);
  }, [gatewayClient, updateStatus]);

  // 发送 RPC
  const send = useCallback(async (method: string, params?: any): Promise<any> => {
    if (!gatewayClient.isConnected()) {
      throw new Error('Gateway not connected');
    }
    return gatewayClient.send(method, params);
  }, [gatewayClient]);

  // 订阅事件
  const on = useCallback((event: string, handler: (data: any) => void): () => void => {
    return gatewayClient.on(event, handler);
  }, [gatewayClient]);

  // 重连逻辑
  const scheduleReconnect = useCallback(() => {
    if (isManualDisconnectRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= maxRetries) {
      setError(new Error(`Max reconnection attempts (${maxRetries}) reached`));
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectInterval * reconnectAttemptsRef.current;

    console.log(`🔄 Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect().catch(() => {
        // 连接失败会通过 onclose 触发下一次重连
      });
    }, delay);
  }, [connect, maxRetries, reconnectInterval]);

  // 监听 Gateway 进程事件 (来自 Rust)
  useEffect(() => {
    let unlistenReady: (() => void) | undefined;
    let unlistenFailed: (() => void) | undefined;

    onGatewayReady((port) => {
      console.log('🔔 Gateway process ready on port:', port);
      updateStatus(true, false); // 运行但未连接
      reconnectAttemptsRef.current = 0;

      // Gateway 重启后自动重连
      if (autoConnect && !gatewayClient.isConnected()) {
        connect().catch(() => {
          // 会触发重连
        });
      }
    }).then((fn) => {
      unlistenReady = fn;
    });

    onGatewayStartFailed(() => {
      console.error('🔔 Gateway process failed');
      updateStatus(false, false);
      gatewayClient.disconnect();
    }).then((fn) => {
      unlistenFailed = fn;
    });

    return () => {
      unlistenReady?.();
      unlistenFailed?.();
    };
  }, [autoConnect, connect, gatewayClient, updateStatus]);

  // 监听 GatewayClient 断开事件 (自动重连)
  useEffect(() => {
    const handleDisconnect = () => {
      if (!isManualDisconnectRef.current) {
        scheduleReconnect();
      }
    };

    // 通过定期检查连接状态来检测断开
    const checkInterval = setInterval(() => {
      const wasConnected = gatewayClient.isConnected();
      if (!wasConnected && !isManualDisconnectRef.current && isRunning) {
        handleDisconnect();
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [gatewayClient, isRunning, scheduleReconnect]);

  // 自动连接
  useEffect(() => {
    if (autoConnect && isRunning && !gatewayClient.isConnected() && !isManualDisconnectRef.current) {
      connect().catch(() => {
        // 会触发重连
      });
    }
  }, [autoConnect, isRunning, gatewayClient, connect]);

  return {
    isConnected: gatewayClient.isConnected(),
    isRunning,
    isConnecting,
    error,
    send,
    on,
    connect,
    disconnect,
    reconnect: connect,
  };
}
