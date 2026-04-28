/**
 * Gateway Client - Gateway 通信客户端
 * 
 * 负责:
 * 1. WebSocket 连接管理
 * 2. RPC 请求/响应处理
 * 3. 事件订阅和分发
 * 4. 自动重连机制
 */

/**
 * Gateway 消息帧
 */
export interface GatewayMessage {
  type: 'req' | 'resp' | 'res' | 'evt' | 'event';
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  payload?: any;  // Gateway 使用 payload 而不是 result
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  event?: string;
  data?: any;
  ok?: boolean;  // Gateway 响应中的 ok 字段
}

/**
 * 事件处理器
 */
type EventHandler = (data: any) => void;

/**
 * Gateway 客户端配置
 */
export interface GatewayConfig {
  url: string;
  token?: string;              // 认证 Token (可选)
  reconnectInterval?: number;  // 重连间隔 (ms)
  requestTimeout?: number;     // 请求超时 (ms)
  maxRetries?: number;         // 最大重试次数
  onConnected?: () => void;    // 连接成功回调
  onDisconnected?: () => void; // 断开连接回调
}

/**
 * Gateway 客户端
 * 
 * 核心职责:
 * - 管理 WebSocket 连接
 * - 发送 RPC 请求并等待响应
 * - 接收和处理事件
 * - 自动重连和错误恢复
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: ReturnType<typeof setTimeout>;
    method?: string;  // 请求方法名，用于识别握手响应
  }> = new Map();
  
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private config: GatewayConfig;
  private reconnectAttempts: number = 0;
  private isManualClose: boolean = false;
  private connected: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  
  // 状态变更事件处理器
  private stateChangeHandlers: Set<(state: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  /**
   * 构造函数
   * @param config Gateway 配置
   */
  constructor(config?: Partial<GatewayConfig>) {
    this.config = {
      url: 'ws://127.0.0.1:3001',
      reconnectInterval: 3000,
      requestTimeout: 30000,
      maxRetries: 5,
      ...config,
    };
  }

  /**
   * 连接到 Gateway
   * 
   * @returns Promise,连接成功时 resolve
   */
  connect(): Promise<void> {
    // 如果已经连接，直接返回
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.connected) {
      console.log('✅ Gateway already connected, skipping');
      return Promise.resolve();
    }

    // 如果正在连接，返回已有的 promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    return this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.isManualClose = false;
        
        // 如果已有连接，先关闭它
        if (this.ws) {
          console.log('⚠️ Closing existing WebSocket connection before creating new one');
          this.ws.onclose = null; // 移除旧的事件处理器，避免触发重连
          this.ws.onerror = null;
          this.ws.close();
          this.ws = null;
        }
        
        // 不将 token 放在 URL query string 中，让 handshake 处理
        const wsUrl = this.config.url;
        
        console.log('🔗 Creating new WebSocket connection to:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        console.log('🔗 WebSocket created, initial readyState:', this.ws.readyState);

        this.ws.onopen = async () => {
          // 防止重复调用
          if (this.connected) {
            console.log('⚠️ Already connected, ignoring duplicate onopen event');
            return;
          }
          
          console.log('✅ WebSocket connected, sending handshake...');
          console.log('🔗 WebSocket readyState:', this.ws!.readyState);
          console.log('🔗 WebSocket URL:', this.ws!.url);
          this.reconnectAttempts = 0;
          
          // 通知正在连接
          this.notifyStateChange('connecting');
          
          // 发送 connect 握手消息
          try {
            console.log('🤝 Starting handshake process...');
            await this.sendHandshake();
            console.log('✅ Gateway handshake successful');
            this.connected = true;
            this.connectionPromise = null; // 清除连接 promise
            
            // 通知连接成功
            this.notifyStateChange('connected');
            if (this.config.onConnected) {
              this.config.onConnected();
            }
            resolve();
          } catch (error) {
            console.error('❌ Gateway handshake failed:', error);
            console.error('❌ Handshake error stack:', error instanceof Error ? error.stack : 'N/A');
            this.connectionPromise = null; // 清除连接 promise
            this.notifyStateChange('disconnected');
            reject(error);
            this.ws?.close();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const frame: GatewayMessage = JSON.parse(event.data);
            console.log('📨 Received message:', JSON.stringify(frame, null, 2));
            this.handleMessage(frame);
          } catch (error) {
            console.error('❌ Failed to parse Gateway message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Gateway WebSocket error:', error);
          console.error('❌ Ready state:', this.ws?.readyState);
          console.error('❌ URL:', this.config.url);
          console.error('❌ Buffered amount:', this.ws?.bufferedAmount);
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 Gateway disconnected (code: ${event.code}, reason: ${event.reason})`);
          this.connected = false;
          this.connectionPromise = null;
          this.rejectAllPending(new Error('Gateway disconnected'));
          
          // 通知断开连接
          this.notifyStateChange('disconnected');
          if (this.config.onDisconnected) {
            this.config.onDisconnected();
          }
          
          // 如果不是手动关闭,则自动重连
          if (!this.isManualClose) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('❌ Failed to connect to Gateway:', error);
        reject(error);
      }
    });
  }

  /**
   * 发送 RPC 请求
   *
   * @param method 方法名
   * @param params 参数
   * @returns Promise,响应结果
   */
  async send(method: string, params?: any): Promise<any> {
    // 如果正在连接，等待连接完成
    if (this.connectionPromise) {
      console.log('⏳ Waiting for Gateway connection...');
      await this.connectionPromise.catch(() => {
        // 连接失败，抛出错误
        throw new Error('Gateway not connected');
      });
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Gateway not connected');
    }

    const id = this.generateRequestId();
    
    // 添加调试日志
    console.log(`📤 [RPC Request] method=${method}, id=${id}`, params ? { params } : '');

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          console.error(`❌ [RPC Timeout] method=${method}, id=${id}`);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, this.config.requestTimeout);

      // 保存请求（包含 method 字段）
      this.pendingRequests.set(id, { resolve, reject, timeout, method });

      // 发送请求
      try {
        this.ws!.send(JSON.stringify({
          type: 'req',
          id,
          method,
          params,
        }));
        console.log(`✅ [RPC Sent] method=${method}, id=${id}`);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        console.error(`❌ [RPC Send Error] method=${method}, id=${id}:`, error);
        reject(error);
      }
    });
  }

  /**
   * 订阅事件
   * 
   * @param eventName 事件名
   * @param handler 事件处理器
   * @returns 取消订阅函数
   */
  on(eventName: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }

    this.eventHandlers.get(eventName)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(eventName)?.delete(handler);
    };
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true;
    this.connected = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.rejectAllPending(new Error('Gateway manually disconnected'));
  }

  /**
   * 检查连接状态
   * 
   * @returns 是否已连接（WebSocket 打开且握手完成）
   */
  isConnected(): boolean {
    const wsConnected = this.ws?.readyState === WebSocket.OPEN;
    const handshakeComplete = this.connected;
    return wsConnected && handshakeComplete;
  }

  /**
   * 订阅连接状态变更事件
   * 
   * @param handler 状态变更处理器
   * @returns 取消订阅函数
   */
  onStateChange(handler: (state: 'connecting' | 'connected' | 'disconnected') => void): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * 通知状态变更
   * 
   * @param state 新状态
   */
  private notifyStateChange(state: 'connecting' | 'connected' | 'disconnected'): void {
    console.log(`🔔 [GatewayClient] State changed to: ${state}`);
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('❌ Error in state change handler:', error);
      }
    });
  }

  /**
   * 处理收到的消息
   * 
   * @param frame 消息帧
   */
  private handleMessage(frame: GatewayMessage): void {
    // 添加详细的调试日志
    console.log('📨 [GatewayClient] Received message:', JSON.stringify({
      type: frame.type,
      id: frame.id,
      method: frame.method,
      event: frame.event,
      hasPayload: !!frame.payload,
      hasData: !!frame.data,
    }, null, 2));
    
    // Gateway 可能返回 'resp' 或 'res'
    if ((frame.type === 'resp' || frame.type === 'res') && frame.id) {
      // 处理响应
      console.log('🔧 [GatewayClient] Handling response for id:', frame.id);
      this.handleResponse(frame);
    } else if (frame.type === 'evt' || frame.type === 'event') {
      // 处理事件
      console.log('🔔 [GatewayClient] Handling event:', frame.event);
      this.emitEvent(frame);
    } else {
      console.warn('⚠️ [GatewayClient] Unknown message type:', frame.type, frame);
    }
  }

  /**
   * 处理响应
   * 
   * @param frame 响应帧
   */
  private handleResponse(frame: GatewayMessage): void {
    const pending = this.pendingRequests.get(frame.id!);
    if (!pending) {
      console.warn('⚠️ Received response for unknown request:', frame.id);
      return;
    }

    console.log('🔧 [GatewayClient] Handling response for id:', frame.id, 'method:', pending.method);

    // 清除超时
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(frame.id!);

    if (frame.error) {
      // 错误响应
      console.error(`❌ [RPC Error Response] id=${frame.id}:`, frame.error);
      pending.reject(new Error(frame.error.message || 'Gateway error'));
    } else {
      // 成功响应 - Gateway 使用 payload 或 result
      const result = frame.payload || frame.result;
      console.log(`✅ [RPC Success Response] id=${frame.id}`, result ? '(has data)' : '(no data)');
      pending.resolve(result);
      
      // 如果是握手响应，通知连接成功
      if (pending.method === 'connect') {
        console.log('✅ Gateway handshake successful, clearing handshake timer');
        if (this.config.onConnected) {
          this.config.onConnected();
        }
      }
    }
  }

  /**
   * 触发事件
   * 
   * @param frame 事件帧
   */
  private emitEvent(frame: GatewayMessage): void {
    if (!frame.event) {
      console.warn('⚠️ Event frame missing event name:', frame);
      return;
    }

    console.log('🔔 [GatewayClient] Emitting event:', frame.event, 'with payload:', JSON.stringify(frame.payload || frame.data, null, 2));
    
    const handlers = this.eventHandlers.get(frame.event);
    if (!handlers || handlers.size === 0) {
      console.log('📨 No handlers for event:', frame.event);
      return;
    }

    console.log(`✅ Found ${handlers.size} handler(s) for event: ${frame.event}`);
    
    // 调用所有处理器 - Gateway 使用 payload 而不是 data
    const eventData = frame.payload || frame.data;
    handlers.forEach(handler => {
      try {
        handler(eventData);
      } catch (error) {
        console.error(`❌ Error in event handler for ${frame.event}:`, error);
      }
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxRetries || 5)) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval || 3000;

    console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * 拒绝所有待处理的请求
   * 
   * @param error 错误对象
   */
  private rejectAllPending(error: Error): void {
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(error);
    });
    this.pendingRequests.clear();
  }

  /**
   * 生成请求 ID
   * 
   * @returns 唯一请求 ID
   */
  private generateRequestId(): string {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  /**
   * 发送握手消息
   * Gateway 要求第一个消息必须是 connect 握手
   */
  private async sendHandshake(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const id = this.generateRequestId();
    const handshakeMessage = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,  // Gateway 协议版本 3
        maxProtocol: 3,  // Gateway 协议版本 3
        client: {
          id: 'openclaw-control-ui',  // 使用预定义的 client id
          displayName: 'Tauri Desktop App',
          version: '1.0.0',
          platform: 'desktop-tauri',
          mode: 'ui',  // 使用预定义的 mode: ui/webchat/cli/backend/node/probe/test
        },
        // 如果有 token，添加到 auth 中
        ...(this.config.token && {
          auth: {
            token: this.config.token,
          },
        }),
        // Control UI 需要的 scopes（包含 admin 权限以支持 config.patch）
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
      },
    };

    console.log('🤝 Sending handshake:', JSON.stringify(handshakeMessage, null, 2));
    console.log('🔑 Token configured:', this.config.token ? 'YES' : 'NO');

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          console.error('❌ Handshake timeout');
          reject(new Error('Handshake timeout'));
        }
      }, 5000); // 握手超时 5 秒

      // 保存请求（包含 method 字段用于握手响应识别）
      console.log('💾 Saving handshake request with id:', id, 'method:', 'connect');
      this.pendingRequests.set(id, { resolve, reject, timeout, method: 'connect' });
      try {
        this.ws!.send(JSON.stringify(handshakeMessage));
        console.log('✅ Handshake sent successfully');
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        console.error('❌ Failed to send handshake:', error);
        reject(error);
      }
    });
  }
}
