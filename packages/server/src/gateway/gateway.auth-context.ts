// Slice 2026-07-02-gateway-gateway-split-transport: extracts the
// authentication / authorization context helpers (storeClientContext plus the
// five requireXxxContext accessors) from gateway.gateway.ts (lines 425-478
// of the pre-split file) into a dedicated class. The class receives the shared
// clients Map by reference so it always reads the live context that the
// gateway has most recently stored.
import { WebSocket } from 'ws';

interface GatewayClientContext {
  userId?: string;
  teamId?: string;
  role?: string;
  expiresAt?: number;
}

export class GatewayAuthContext {
  constructor(
    private readonly clients: Map<WebSocket, GatewayClientContext>,
  ) {}

  storeClientContext(ws: WebSocket, result: { expiresAt?: number; user?: { id: string; team?: { id: string; role: string } | null } }): void {
    if (!result.user) return;

    const clientInfo = this.clients.get(ws);
    if (clientInfo) {
      clientInfo.userId = result.user.id;
      clientInfo.teamId = result.user.team?.id;
      clientInfo.role = result.user.team?.role;
      clientInfo.expiresAt = result.expiresAt;
    }
  }

  requireUserContext(ws: WebSocket): Required<Pick<GatewayClientContext, 'userId'>> {
    const clientInfo = this.getAuthenticatedClientContext(ws);
    return { userId: clientInfo.userId };
  }

  requireAdminContext(ws: WebSocket): Required<Pick<GatewayClientContext, 'userId' | 'teamId' | 'role'>> {
    const clientInfo = this.requireClientContext(ws);
    if (clientInfo.role !== 'OWNER' && clientInfo.role !== 'ADMIN') {
      throw new Error('Admin privileges required');
    }
    return clientInfo;
  }

  requirePlatformAdminContext(ws: WebSocket): never {
    this.requireAdminContext(ws);
    throw new Error('Platform admin privileges required');
  }

  requireClientContext(ws: WebSocket): Required<Pick<GatewayClientContext, 'userId' | 'teamId' | 'role'>> {
    const clientInfo = this.getAuthenticatedClientContext(ws);
    if (!clientInfo.teamId || !clientInfo.role) {
      throw new Error('Authentication required');
    }
    return {
      userId: clientInfo.userId,
      teamId: clientInfo.teamId,
      role: clientInfo.role,
    };
  }

  getAuthenticatedClientContext(ws: WebSocket): Required<Pick<GatewayClientContext, 'userId' | 'expiresAt'>> & Pick<GatewayClientContext, 'teamId' | 'role'> {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo?.userId || !clientInfo.expiresAt || clientInfo.expiresAt <= Date.now()) {
      throw new Error('Authentication required');
    }
    return {
      userId: clientInfo.userId,
      teamId: clientInfo.teamId,
      role: clientInfo.role,
      expiresAt: clientInfo.expiresAt,
    };
  }
}
