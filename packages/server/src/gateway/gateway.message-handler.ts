// Slice 2026-07-02-gateway-gateway-split-final: extracts the 282L
// `handleMessage` switch/case from gateway.gateway.ts (lines 84-364 of the
// post-slice-2 file) into a dedicated class. The class receives the shared
// clients Map by reference, a gatewayService getter for late binding, and
// the four cluster helpers (validators / transport / authContext /
// errorMapper) that were extracted in slices 1-2.
import { Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import type { GatewayMessage } from './gateway.types';
import type { GatewayValidators } from './gateway.validators';
import type { GatewayTransport } from './gateway.transport';
import type { GatewayAuthContext } from './gateway.auth-context';
import type { GatewayErrorMapper } from './gateway.error-mapper';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

// Narrow structural type covering only the methods invoked from the
// switch/case. Keep loose here — the real GatewayService in gateway.service.ts
// is the source of truth, and slices 1-2 already validated that the wiring
// uses these methods in exactly the order shown below.
type GatewayServiceLike = {
  [key: string]: any;
};

export class GatewayMessageHandler {
  constructor(
    private readonly clients: Map<WebSocket, GatewayClientContext>,
    private readonly gatewayService: () => GatewayServiceLike | null,
    private readonly validators: GatewayValidators,
    private readonly transport: GatewayTransport,
    private readonly authContext: GatewayAuthContext,
    private readonly errorMapper: GatewayErrorMapper,
    private readonly logger: Logger,
    private readonly maxRawMessageBytes: number,
  ) {}

  async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    const gatewayService = this.gatewayService();
    if (!gatewayService) {
      this.logger.error('gatewayService is undefined! DI not working properly.');
      return;
    }
    let oversizedMessageId: string | undefined;
    if (data.length > this.maxRawMessageBytes) {
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
          result = await gatewayService.connect(params, ws);
          this.authContext.storeClientContext(ws, result);
          break;
        case 'auth.register':
          result = await gatewayService.register(params);
          break;
        case 'auth.login':
          result = await gatewayService.login(params);
          this.authContext.storeClientContext(ws, result);
          break;
        case 'auth.refresh':
          result = await gatewayService.refresh(params);
          break;
        case 'quota.get':
          result = await gatewayService.getQuota({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.list':
          result = await gatewayService.listConversations({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.create':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await gatewayService.createConversation({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
            });
          }
          break;
        case 'conversation.get':
          result = await gatewayService.getConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.update':
          result = await gatewayService.updateConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.delete':
          result = await gatewayService.deleteConversation({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'conversation.messages':
          result = await gatewayService.getMessages({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'config.get':
          this.authContext.requirePlatformAdminContext(ws);
          result = await gatewayService.getConfig(params);
          break;
        case 'config.patch':
          this.authContext.requirePlatformAdminContext(ws);
          result = await gatewayService.patchConfig(params);
          break;
        case 'config.set':
          this.authContext.requirePlatformAdminContext(ws);
          result = await gatewayService.setConfig(params);
          // Emit config-changed event if restart is needed
          if (result?.needsRestart) {
            this.logger.log('Config changed, emitting config-changed event');
            this.emitConfigChanged(ws);
          }
          break;
        case 'hermes.sessions':
          result = await gatewayService.getHermesSessions(params);
          break;
        case 'hermes.send':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            const hermesParams = this.validators.validateHermesSendParams(params);
            result = await gatewayService.sendHermesMessage(
              { ...hermesParams, teamId: clientInfo.teamId, userId: clientInfo.userId, role: clientInfo.role },
              ws,
            );
          }
          break;
        case 'hermes.abort':
          result = await gatewayService.abortHermesMessage(params, ws);
          break;
        case 'hermes.agentStatus':
          result = await gatewayService.getHermesAgentStatus();
          break;
        case 'usage.status':
          result = await gatewayService.getUsageStatus({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'quota.getConfig':
          result = await gatewayService.getQuotaConfig({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'quota.updateConfig':
          result = await gatewayService.updateQuotaConfig({ ...params, teamId: this.authContext.requireAdminContext(ws).teamId });
          break;
        case 'experts.list':
          result = await gatewayService.listExperts({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.get':
          result = await gatewayService.getExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.create':
          result = await gatewayService.createExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.update':
          result = await gatewayService.updateExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.delete':
          result = await gatewayService.deleteExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.setActive':
          result = await gatewayService.setActiveExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.categories':
          result = await gatewayService.getExpertCategories({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.stats':
          result = await gatewayService.getExpertStats({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.rate':
          result = await gatewayService.rateExpert({ ...params, teamId: this.authContext.requireClientContext(ws).teamId });
          break;
        case 'experts.recordUsage':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await gatewayService.recordExpertUsage({
              ...params,
              userId: clientInfo.userId,
              teamId: clientInfo.teamId,
            });
          }
          break;
        case 'extensions.list':
          result = await gatewayService.getAllExtensions();
          break;
        case 'extensions.installed':
          result = await gatewayService.getInstalledExtensions({ userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.install':
          result = await gatewayService.installExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.uninstall':
          result = await gatewayService.uninstallExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.enable':
          result = await gatewayService.enableExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.disable':
          result = await gatewayService.disableExtension({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'extensions.updateConfig':
          result = await gatewayService.updateExtensionConfig({ ...params, userId: this.authContext.requireUserContext(ws).userId });
          break;
        case 'skills.list':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await gatewayService.listSkills({
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
            result = await gatewayService.getSkill({
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
            result = await gatewayService.createSkill({
              ...params,
              teamId: clientInfo.teamId,
              authorId: clientInfo.userId,
            });
          }
          break;
        case 'skills.update':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await gatewayService.updateSkill({
              ...params,
              teamId: clientInfo.teamId,
              userId: clientInfo.userId,
              role: clientInfo.role,
            });
          }
          break;
        case 'skills.publishTeam':
          result = await gatewayService.requestPublishSkillToTeam(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.approveTeam':
          result = await gatewayService.approveTeamSkillPublish(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.rejectTeam':
          result = await gatewayService.rejectTeamSkillPublish(params, this.authContext.requireClientContext(ws));
          break;
        case 'skills.publishMarketplace':
          result = await gatewayService.requestPublishSkillToMarketplace(params, this.authContext.requireClientContext(ws));
          break;
        case 'marketplace_skills.list':
          result = await gatewayService.listMarketplaceSkills(params);
          break;
        case 'skills.delete':
          {
            const clientInfo = this.authContext.requireClientContext(ws);
            result = await gatewayService.deleteSkill({
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
            result = await gatewayService.generateConfig(
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

  private emitConfigChanged(ws: WebSocket): void {
    this.transport.emitToClient(ws, 'config-changed', { reason: 'config-updated' });
  }
}