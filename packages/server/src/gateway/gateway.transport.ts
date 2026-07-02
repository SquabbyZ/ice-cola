// Slice 2026-07-02-gateway-gateway-split-transport: extracts the wire-transport
// helpers (sendResponse / emitToClient / broadcastToTeam) from gateway.gateway.ts
// (lines 574+ of the pre-split file) into a dedicated class. The class receives
// the shared clients Map by reference so callers share state without copying.
import { Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import type { GatewayMessage } from './gateway.types';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

export class GatewayTransport {
  private readonly logger = new Logger(GatewayTransport.name);

  constructor(
    private readonly clients: Map<WebSocket, GatewayClientContext>,
  ) {}

  sendResponse(ws: WebSocket, id: string | undefined, payload: any, error?: { code: number; message: string }): void {
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
}
