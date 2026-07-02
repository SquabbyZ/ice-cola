// Slice 2026-07-02-gateway-gateway-split-final: extracts the WebSocket server
// bootstrap (initialize) from gateway.gateway.ts (lines 34-56 of the post-slice-2
// file) plus the per-connection close/error cleanup into a dedicated class.
// The class receives the shared clients Map by reference and a gatewayService
// getter so late binding (set after construction) still works.
//
// The facade's own handleConnection still wires the 'message' listener so that
// `this.handleMessage` resolves to the facade method (preserving the spec's
// `socket.on('message', (data) => this.handleMessage(ws, data))` shape).
import { Logger } from '@nestjs/common';
import { WebSocket, WebSocketServer } from 'ws';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

interface GatewayServiceLike {
  abortStreamsForSocket(ws: WebSocket): Promise<void>;
}

export class GatewayConnection {
  private wss: WebSocketServer | null = null;

  constructor(
    private readonly clients: Map<WebSocket, GatewayClientContext>,
    private readonly gatewayService: () => GatewayServiceLike | null,
    private readonly logger: Logger,
  ) {}

  initialize(port: number): Promise<void> {
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

  handleConnection(ws: WebSocket): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.logger.log(`Client connected: ${clientId}`);
    this.clients.set(ws, { userId: undefined, teamId: undefined });

    ws.on('close', () => {
      this.logger.log(`Client disconnected: ${clientId}`);
      this.gatewayService()?.abortStreamsForSocket(ws).catch(error => {
        this.logger.error(`Failed to abort active streams for disconnected client ${clientId}:`, error);
      });
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for ${clientId}:`, error);
      this.gatewayService()?.abortStreamsForSocket(ws).catch(abortError => {
        this.logger.error(`Failed to abort active streams for errored client ${clientId}:`, abortError);
      });
      this.clients.delete(ws);
    });
  }

  getWss(): WebSocketServer | null {
    return this.wss;
  }
}