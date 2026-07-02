// Slice 2026-07-02-gateway-gateway-split-final: gateway.gateway.ts is now a
// thin facade. The 282L handleMessage switch/case lives in
// gateway.message-handler.ts and the WebSocket bootstrap / per-connection
// close-error cleanup lives in gateway.connection.ts. The facade keeps the
// fields and methods required for spec compatibility (`gatewayService` write,
// `handleConnection` private delegate, `handleMessage` public delegate, `getWs`)
// plus the lifecycle hooks (onModuleInit / initialize) and broadcast helpers
// (emitToClient / broadcastToTeam) used by GatewayModule.
import { WebSocket, WebSocketServer } from 'ws';
import { Logger, OnModuleInit } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayValidators } from './gateway.validators';
import { GatewayErrorMapper } from './gateway.error-mapper';
import { GatewayTransport } from './gateway.transport';
import { GatewayAuthContext } from './gateway.auth-context';
import { GatewayConnection } from './gateway.connection';
import { GatewayMessageHandler } from './gateway.message-handler';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

export class GatewayGateway implements OnModuleInit {
  private readonly logger = new Logger(GatewayGateway.name);
  private readonly MAX_RAW_MESSAGE_BYTES = 15 * 1024 * 1024;
  private clients: Map<WebSocket, GatewayClientContext> = new Map();
  gatewayService: GatewayService | null = null;
  private readonly validators: GatewayValidators = new GatewayValidators();
  private readonly errorMapper: GatewayErrorMapper = new GatewayErrorMapper();
  private readonly transport: GatewayTransport = new GatewayTransport(this.clients);
  private readonly authContext: GatewayAuthContext = new GatewayAuthContext(this.clients);
  private readonly connection: GatewayConnection = new GatewayConnection(
    this.clients,
    () => this.gatewayService,
    this.logger,
  );
  private readonly messageHandler: GatewayMessageHandler = new GatewayMessageHandler(
    this.clients,
    () => this.gatewayService,
    this.validators,
    this.transport,
    this.authContext,
    this.errorMapper,
    this.logger,
    this.MAX_RAW_MESSAGE_BYTES,
  );

  onModuleInit() {
    this.logger.log(`GatewayGateway onModuleInit`);
  }

  async initialize(port: number, gatewayService: GatewayService): Promise<void> {
    this.gatewayService = gatewayService;
    // Set gateway instance reference for streaming events
    this.gatewayService.setGatewayInstance(this);
    this.logger.log(`GatewayGateway initialize, gatewayService: ${!!this.gatewayService}`);
    return this.connection.initialize(port);
  }

  // REQUIRED for spec compat: `gateway['handleConnection'](socket)` is called
  // from gateway.gateway.spec.ts. We delegate to connection for close/error
  // lifecycle cleanup and wire the 'message' listener ourselves so that
  // `this.handleMessage` resolves to the facade method.
  private handleConnection(ws: WebSocket): void {
    this.connection.handleConnection(ws);
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });
  }

  // Public handleMessage delegate so `socket.on('message', (data) =>
  // this.handleMessage(ws, data))` inside handleConnection resolves to a
  // method on the facade.
  async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
    return this.messageHandler.handleMessage(ws, data);
  }

  emitToClient(ws: WebSocket, event: string, data: any): void {
    this.transport.emitToClient(ws, event, data);
  }

  broadcastToTeam(teamId: string, event: string, data: any): void {
    this.transport.broadcastToTeam(teamId, event, data);
  }

  getWs(): WebSocketServer | null {
    return this.connection.getWss();
  }
}