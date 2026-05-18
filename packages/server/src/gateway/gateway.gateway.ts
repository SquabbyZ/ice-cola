import { WebSocketServer, WebSocket } from 'ws';
import { Logger, OnModuleInit } from '@nestjs/common';
import { GatewayService } from './gateway.service';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
}

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
  private clients: Map<WebSocket, GatewayClientContext> = new Map();
  private gatewayService: GatewayService | null = null;

  constructor() {}

  onModuleInit() {
    this.logger.log(`GatewayGateway onModuleInit`);
  }

  async initialize(port: number, gatewayService: GatewayService): Promise<void> {
    this.gatewayService = gatewayService;
    // Set gateway instance reference for streaming events
    this.gatewayService.setGatewayInstance(this);
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
          this.storeClientContext(ws, result);
          break;
        case 'auth.register':
          result = await this.gatewayService.register(params);
          break;
        case 'auth.login':
          result = await this.gatewayService.login(params);
          this.storeClientContext(ws, result);
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
          this.requireAdminContext(ws);
          result = await this.gatewayService.getConfig(params);
          break;
        case 'config.patch':
          this.requireAdminContext(ws);
          result = await this.gatewayService.patchConfig(params);
          break;
        case 'config.set':
          this.requireAdminContext(ws);
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
          {
            const clientInfo = this.requireClientContext(ws);
            result = await this.gatewayService.sendHermesMessage(
              { ...params, teamId: clientInfo.teamId },
              ws,
            );
          }
          break;
        case 'hermes.abort':
          result = this.gatewayService.abortHermesMessage(params, ws);
          break;
        case 'hermes.agentStatus':
          result = await this.gatewayService.getHermesAgentStatus();
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
          result = await this.gatewayService.listExperts({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.get':
          result = await this.gatewayService.getExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.create':
          result = await this.gatewayService.createExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.update':
          result = await this.gatewayService.updateExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.delete':
          result = await this.gatewayService.deleteExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.setActive':
          result = await this.gatewayService.setActiveExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.categories':
          result = await this.gatewayService.getExpertCategories({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.stats':
          result = await this.gatewayService.getExpertStats({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.rate':
          result = await this.gatewayService.rateExpert({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'experts.recordUsage':
          {
            const clientInfo = this.requireClientContext(ws);
            result = await this.gatewayService.recordExpertUsage({
              ...params,
              userId: clientInfo.userId,
              teamId: clientInfo.teamId,
            });
          }
          break;
        case 'extensions.list':
          result = await this.gatewayService.getAllExtensions();
          break;
        case 'extensions.installed':
          result = await this.gatewayService.getInstalledExtensions({ userId: this.requireUserContext(ws).userId });
          break;
        case 'extensions.install':
          result = await this.gatewayService.installExtension({ ...params, userId: this.requireUserContext(ws).userId });
          break;
        case 'extensions.uninstall':
          result = await this.gatewayService.uninstallExtension({ ...params, userId: this.requireUserContext(ws).userId });
          break;
        case 'extensions.enable':
          result = await this.gatewayService.enableExtension({ ...params, userId: this.requireUserContext(ws).userId });
          break;
        case 'extensions.disable':
          result = await this.gatewayService.disableExtension({ ...params, userId: this.requireUserContext(ws).userId });
          break;
        case 'extensions.updateConfig':
          result = await this.gatewayService.updateExtensionConfig({ ...params, userId: this.requireUserContext(ws).userId });
          break;
        case 'skills.list':
          result = await this.gatewayService.listSkills({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'skills.get':
          result = await this.gatewayService.getSkill({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'skills.create':
          {
            const clientInfo = this.requireClientContext(ws);
            result = await this.gatewayService.createSkill({
              ...params,
              teamId: clientInfo.teamId,
              authorId: clientInfo.userId,
            });
          }
          break;
        case 'skills.update':
          result = await this.gatewayService.updateSkill({ ...params, teamId: this.requireClientContext(ws).teamId });
          break;
        case 'skills.publishTeam':
          result = await this.gatewayService.requestPublishSkillToTeam(params, this.requireClientContext(ws));
          break;
        case 'skills.approveTeam':
          result = await this.gatewayService.approveTeamSkillPublish(params, this.requireClientContext(ws));
          break;
        case 'skills.rejectTeam':
          result = await this.gatewayService.rejectTeamSkillPublish(params, this.requireClientContext(ws));
          break;
        case 'skills.publishMarketplace':
          result = await this.gatewayService.requestPublishSkillToMarketplace(params, this.requireClientContext(ws));
          break;
        case 'marketplace_skills.list':
          result = await this.gatewayService.listMarketplaceSkills(params);
          break;
        case 'skills.delete':
          result = await this.gatewayService.deleteSkill({ ...params, teamId: this.requireClientContext(ws).teamId });
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

  private storeClientContext(ws: WebSocket, result: { user?: { id: string; team?: { id: string; role: string } } }): void {
    if (!result.user) return;

    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.userId = result.user.id;
      clientInfo.teamId = result.user.team?.id;
      clientInfo.role = result.user.team?.role;
    }
  }

  private requireUserContext(ws: WebSocket): Required<Pick<GatewayClientContext, 'userId'>> {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo?.userId) {
      throw new Error('Authentication required');
    }
    return { userId: clientInfo.userId };
  }

  private requireAdminContext(ws: WebSocket): Required<GatewayClientContext> {
    const clientInfo = this.requireClientContext(ws);
    if (clientInfo.role !== 'OWNER' && clientInfo.role !== 'ADMIN') {
      throw new Error('Admin privileges required');
    }
    return clientInfo;
  }

  private requireClientContext(ws: WebSocket): Required<GatewayClientContext> {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo?.userId || !clientInfo.teamId || !clientInfo.role) {
      throw new Error('Authentication required');
    }
    return {
      userId: clientInfo.userId,
      teamId: clientInfo.teamId,
      role: clientInfo.role,
    };
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
