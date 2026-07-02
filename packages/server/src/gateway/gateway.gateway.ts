import { WebSocketServer, WebSocket } from 'ws';
import { Logger, OnModuleInit } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayValidators } from './gateway.validators';
import { GatewayErrorMapper } from './gateway.error-mapper';
import { GatewayTransport } from './gateway.transport';
import { GatewayAuthContext } from './gateway.auth-context';
import type { GatewayMessage } from './gateway.types';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

export class GatewayGateway implements OnModuleInit {
  private readonly logger = new Logger(GatewayGateway.name);
  private readonly MAX_RAW_MESSAGE_BYTES = 15 * 1024 * 1024;
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, GatewayClientContext> = new Map();
  private gatewayService: GatewayService | null = null;
  private validators: GatewayValidators = new GatewayValidators();
  private errorMapper: GatewayErrorMapper = new GatewayErrorMapper();
  private transport: GatewayTransport = new GatewayTransport(this.clients);
  private authContext: GatewayAuthContext = new GatewayAuthContext(this.clients);

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
      this.gatewayService?.abortStreamsForSocket(ws).catch(error => {
        this.logger.error(`Failed to abort active streams for disconnected client ${clientId}:`, error);
      });
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for ${clientId}:`, error);
      this.gatewayService?.abortStreamsForSocket(ws).catch(abortError => {
        this.logger.error(`Failed to abort active streams for errored client ${clientId}:`, abortError);
      });
      this.clients.delete(ws);
    });
  }

  private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    if (!this.gatewayService) {
      this.logger.error('gatewayService is undefined! DI not working properly.');
      return;
    }
    let oversizedMessageId: string | undefined;
    if (data.length > this.MAX_RAW_MESSAGE_BYTES) {
      const payloadPrefix = data.subarray(0, 1024).toString();
      const idMatch = payloadPrefix.match(/"id"\s*:\s*"([^"]+)"/);
      oversizedMessageId = idMatch?.[1];
      this.logger.warn(`Rejected oversized WebSocket message: ${data.length} bytes`);
      this.transport.sendResponse(ws, oversizedMessageId, null, {
        code: -32001,
        message: 'Message too large',
      });
      return;
    }

    const rawPayload = data.toString();
    let message: GatewayMessage;
    try {
      message = JSON.parse(rawPayload);
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
          this.authContext.storeClientContext(ws, result);
          break;
        case 'auth.register':
          result = await this.gatewayService.register(params);
          break;
        case 'auth.login':
          result = await this.gatewayService.login(params);
          this.authContext.storeClientContext(ws, result);
          break;
        case 'auth.refresh':
          result = await this.gatewayService.refresh(params);
          break;
        case 'quota.get':
          result = await this.gatewayService.getQuota({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.list':
          result = await this.gatewayService.listConversations({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.create':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.createConversation({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
            });
          }
          break;
        case 'conversation.get':
          result = await this.gatewayService.getConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.update':
          result = await this.gatewayService.updateConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.delete':
          result = await this.gatewayService.deleteConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.messages':
          result = await this.gatewayService.getMessages({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'config.get':
          this.authContext.requirePlatformAdminContext(ws);
          result = await this.gatewayService.getConfig(params);
          break;
        case 'config.patch':
          this.authContext.requirePlatformAdminContext(ws);
          result = await this.gatewayService.patchConfig(params);
          break;
        case 'config.set':
          this.authContext.requirePlatformAdminContext(ws);
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
            const clientInfo = this.authContext.requireClientContext(ws);
            const hermesParams = this.validators.validateHermesSendParams(params);
            result = await this.gatewayService.sendHermesMessage(
              { ...hermesParams, teamId: clientInfo.teamId, userId: clientInfo.userId, role: clientInfo.role },
              ws,
            );
          }
          break;
        case 'hermes.abort':
          result = await this.gatewayService.abortHermesMessage(params, ws);
          break;
        case 'hermes.agentStatus':
          result = await this.gatewayService.getHermesAgentStatus();
          break;
        case 'usage.status':
          result = await this.gatewayService.getUsageStatus({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'quota.getConfig':
          result = await this.gatewayService.getQuotaConfig({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'quota.updateConfig':
          result = await this.gatewayService.updateQuotaConfig({ ...params, teamId: this.authContext.requireAdminContext(ws).teamId });
          break;
        case 'experts.list':
          result = await this.gatewayService.listExperts({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.get':
          result = await this.gatewayService.getExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.create':
          result = await this.gatewayService.createExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.update':
          result = await this.gatewayService.updateExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.delete':
          result = await this.gatewayService.deleteExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.setActive':
          result = await this.gatewayService.setActiveExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.categories':
          result = await this.gatewayService.getExpertCategories({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.stats':
          result = await this.gatewayService.getExpertStats({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.rate':
          result = await this.gatewayService.rateExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.recordUsage':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
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
          result = await this.gatewayService.getInstalledExtensions({ userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.install':
          result = await this.gatewayService.installExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.uninstall':
          result = await this.gatewayService.uninstallExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.enable':
          result = await this.gatewayService.enableExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.disable':
          result = await this.gatewayService.disableExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.updateConfig':
          result = await this.gatewayService.updateExtensionConfig({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'skills.list':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.listSkills({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
              role: clientInfo.role,
            });
          }
          break;
        case 'skills.get':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.getSkill({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
              role: clientInfo.role,
            });
          }
          break;
        case 'skills.create':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.createSkill({
              ...params,
              teamId: clientInfo.teamId,
              authorId: clientInfo.userId,
            });
          }
          break;
        case 'skills.update':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.updateSkill({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
              role: clientInfo.role,
            });
          }
          break;
        case 'skills.publishTeam':
          result = await this.gatewayService.requestPublishSkillToTeam(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.approveTeam':
          result = await this.gatewayService.approveTeamSkillPublish(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.rejectTeam':
          result = await this.gatewayService.rejectTeamSkillPublish(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.publishMarketplace':
          result = await this.gatewayService.requestPublishSkillToMarketplace(params, this.authContext.requireClientContext(ws));
          break;
        case 'marketplace_skills.list':
          result = await this.gatewayService.listMarketplaceSkills(params);
          break;
        case 'skills.delete':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.deleteSkill({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
              role: clientInfo.role,
            });
          }
          break;
        case 'generate.config':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await this.gatewayService.generateConfig(
              { ...params, teamId: clientInfo.teamId, userId: clientInfo.userId },
              ws,
            );
          }
          break;
        default:
          this.logger.warn(`Unknown method: ${method}`);
          this.transport.sendResponse(ws, id, null, {
            code: -32601,
            message: `Method not found: ${method}`,
          });
          return;
      }

      this.transport.sendResponse(ws, id, result);
    } catch (error) {
      this.logger.error(`Error handling ${method}:`, error);
      this.transport.sendResponse(ws, id, null, {
        code: -32603,
        message: this.errorMapper.getPublicErrorMessage(error),
      });
    }
  }

  emitToClient(ws: WebSocket, event: string, data: any): void {
    this.transport.emitToClient(ws, event, data);
  }

  broadcastToTeam(teamId: string, event: string, data: any): void {
    this.transport.broadcastToTeam(teamId, event, data);
  }

  getWs(): WebSocketServer | null {
    return this.wss;
  }
}
