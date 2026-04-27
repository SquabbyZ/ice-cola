import { WebSocketServer, WebSocket } from 'ws';
import { Logger, OnModuleInit } from '@nestjs/common';
import { GatewayService } from './gateway.service';

interface GatewayMessage {
  type: 'req' | 'resp' | 'res' | 'evt' | 'event';
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  payload?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  event?: string;
  data?: any;
  ok?: boolean;
}

export class GatewayGateway implements OnModuleInit {
  private readonly logger = new Logger(GatewayGateway.name);
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, { userId?: string; teamId?: string }> = new Map();
  private gatewayService: GatewayService | null = null;

  constructor() {}

  onModuleInit() {
    this.logger.log(`GatewayGateway onModuleInit`);
  }

  async initialize(port: number, gatewayService: GatewayService): Promise<void> {
    this.gatewayService = gatewayService;
    this.logger.log(`GatewayGateway initialize, gatewayService: ${!!this.gatewayService}`);
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port });

      this.wss.on('listening', () => {
        this.logger.log(`WebSocket Gateway running on port ${port}`);
        resolve();
      });

      this.wss.on('error', (error) => {
        this.logger.error('WebSocket server error:', error);
        reject(error);
      });

      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.logger.log(`Client connected: ${clientId}`);
    this.clients.set(ws, { userId: undefined, teamId: undefined });

    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.logger.log(`Client disconnected: ${clientId}`);
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for ${clientId}:`, error);
      this.clients.delete(ws);
    });
  }

  private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    if (!this.gatewayService) {
      this.logger.error('gatewayService is undefined! DI not working properly.');
      return;
    }
    let message: GatewayMessage;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      this.logger.error('Failed to parse message:', error);
      return;
    }

    const { type, id, method, params } = message;

    if (type !== 'req') {
      this.logger.warn(`Invalid message type: ${type}`);
      return;
    }

    this.logger.log(`Received request: ${method} (id: ${id})`);

    try {
      let result: any;

      switch (method) {
        case 'connect':
          result = await this.gatewayService.connect(params, ws);
          break;
        case 'auth.register':
          result = await this.gatewayService.register(params);
          break;
        case 'auth.login':
          result = await this.gatewayService.login(params);
          break;
        case 'auth.refresh':
          result = await this.gatewayService.refresh(params);
          break;
        case 'quota.get':
          result = await this.gatewayService.getQuota(params);
          break;
        case 'conversation.list':
          result = await this.gatewayService.listConversations(params);
          break;
        case 'conversation.create':
          result = await this.gatewayService.createConversation(params);
          break;
        case 'conversation.get':
          result = await this.gatewayService.getConversation(params);
          break;
        case 'conversation.update':
          result = await this.gatewayService.updateConversation(params);
          break;
        case 'conversation.delete':
          result = await this.gatewayService.deleteConversation(params);
          break;
        case 'conversation.messages':
          result = await this.gatewayService.getMessages(params);
          break;
        case 'config.get':
          result = await this.gatewayService.getConfig(params);
          break;
        case 'config.patch':
          result = await this.gatewayService.patchConfig(params);
          break;
        case 'config.set':
          result = await this.gatewayService.setConfig(params);
          // Emit config-changed event if restart is needed
          if (result?.needsRestart) {
            this.logger.log('Config changed, emitting config-changed event');
            this.emitToClient(ws, 'config-changed', { reason: 'config-updated' });
          }
          break;
        case 'hermes.sessions':
          result = await this.gatewayService.getHermesSessions(params);
          break;
        case 'hermes.send':
          result = await this.gatewayService.sendHermesMessage(params);
          break;
        case 'usage.status':
          result = await this.gatewayService.getUsageStatus(params);
          break;
        case 'quota.getConfig':
          result = await this.gatewayService.getQuotaConfig(params);
          break;
        case 'quota.updateConfig':
          result = await this.gatewayService.updateQuotaConfig(params);
          break;
        case 'experts.list':
          result = await this.gatewayService.listExperts(params);
          break;
        default:
          this.logger.warn(`Unknown method: ${method}`);
          this.sendResponse(ws, id, null, {
            code: -32601,
            message: `Method not found: ${method}`,
          });
          return;
      }

      this.sendResponse(ws, id, result);
    } catch (error) {
      this.logger.error(`Error handling ${method}:`, error);
      this.sendResponse(ws, id, null, {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      });
    }
  }

  private sendResponse(ws: WebSocket, id: string | undefined, payload: any, error?: { code: number; message: string }) {
    if (!id) return;

    const response: GatewayMessage = {
      type: 'res',
      id,
      ok: !error,
      payload,
      error,
    };

    try {
      ws.send(JSON.stringify(response));
    } catch (error) {
      this.logger.error('Failed to send response:', error);
    }
  }

  emitToClient(ws: WebSocket, event: string, data: any): void {
    const message: GatewayMessage = {
      type: 'evt',
      event,
      data,
    };
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error('Failed to emit event:', error);
    }
  }

  broadcastToTeam(teamId: string, event: string, data: any): void {
    this.clients.forEach((clientInfo, client) => {
      if (clientInfo.teamId === teamId) {
        this.emitToClient(client, event, data);
      }
    });
  }

  getWs(): WebSocketServer | null {
    return this.wss;
  }
}
