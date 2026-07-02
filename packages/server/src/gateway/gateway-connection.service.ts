// Slice 2026-07-02-gateway-split-connection: connection/auth/token cluster
// extracted from GatewayService. All 9 methods moved verbatim from
// gateway.service.ts with the same signatures and the same behavior.
// `private` access modifiers widened to `public` so GatewayService can
// delegate to them via constructor injection.
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRequiredJwtSecret } from '../config/security-config';
import { DatabaseService } from '../database/database.service';
import { WebSocket } from 'ws';
import {
  generateUUID,
  getJwtSecret,
  getTokenExpiresAt,
} from './gateway.helpers';
import {
  ConnectParams,
  ConnectResult,
  GatewayJwtPayload,
} from './gateway.types';

@Injectable()
export class GatewayConnectionService {
  private readonly logger = new Logger(GatewayConnectionService.name);

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async connect(params: ConnectParams, socket: WebSocket): Promise<ConnectResult> {
    // socket is part of the WebSocket protocol signature; the connection
    // cluster receives it for protocol-level future use but currently
    // does not need to read from it (authentication is token-based).
    void socket;

    this.logger.log(`Connect attempt from client: ${JSON.stringify(params.client)}`);

    const protocol = 3;

    if (!params.auth?.token) {
      throw new Error('Authentication required');
    }

    try {
      const payload = this.jwtService.verify<GatewayJwtPayload>(params.auth.token, {
        secret: getRequiredJwtSecret(this.configService),
      });
      if (payload.type !== 'access') {
        throw new Error('Authentication required');
      }
      const expiresAt = getTokenExpiresAt(payload);
      this.logger.log(`Authenticated user: ${payload.sub}`);

      const user = await this.db.findUserById(payload.sub);
      if (!user) {
        throw new Error('Authentication required');
      }

      const teamId = user.teamId || undefined;
      const userRole = user.role;

      return {
        ok: true,
        protocol,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          team: teamId ? {
            id: teamId,
            name: user.team_name,
            role: userRole || 'MEMBER',
          } : undefined,
        },
      };
    } catch (error: any) {
      this.logger.warn(`Invalid token in connect params: ${error?.message || error}`);
      throw new Error('Authentication required');
    }
  }

  async register(params: { email: string; password: string; name?: string }) {
    const existing = await this.db.findUserByEmail(params.email);
    if (existing) {
      throw new Error('邮箱已被注册');
    }

    const bcrypt = await import('bcryptjs');
    const password = await bcrypt.hash(params.password, 10);
    const id = generateUUID();

    const user = await this.db.queryOne(
      `INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [id, params.email, password, params.name || null]
    );

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.db.findUserByEmail(params.email);
    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(params.password, user.password);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误');
    }

    const tokens = await this.generateTokens(user.id, user.teamId, user.role);

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        team: user.teamId ? {
          id: user.teamId,
          name: user.team_name,
          role: user.role,
        } : null,
      },
      ...tokens,
    };
  }

  async refresh(params: { refreshToken: string }) {
    try {
      const payload = this.jwtService.verify<GatewayJwtPayload>(params.refreshToken, {
        secret: getRequiredJwtSecret(this.configService),
      });

      if (payload.type !== 'refresh' || !payload.sub) {
        throw new Error('无效的刷新令牌');
      }

      const user = await this.db.findUserById(payload.sub);
      if (!user) {
        throw new Error('用户不存在');
      }

      const tokens = await this.generateTokens(user.id, user.teamId || null, user.role);
      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          team: user.teamId ? {
            id: user.teamId,
            name: user.team_name,
            role: user.role,
          } : null,
        },
        ...tokens,
      };
    } catch (error) {
      throw new Error('刷新令牌失败');
    }
  }

  async generateTokens(userId: string, teamId: string | null, role: string) {
    const payload = {
      sub: userId,
      teamId: teamId || '',
      role,
    };

    const secret = getJwtSecret(this.configService);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, type: 'access' }, {
        secret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync({ ...payload, type: 'refresh' }, {
        secret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      expiresAt: Date.now() + 900 * 1000,
    };
  }

  async generateServiceToken(): Promise<string> {
    return this.jwtService.signAsync({
      sub: 'service',
      role: 'admin',
      type: 'access',
    }, {
      secret: getJwtSecret(this.configService),
    });
  }

  getTokenExpiresAt(payload: GatewayJwtPayload): number {
    return getTokenExpiresAt(payload);
  }

  generateUUID(): string {
    return generateUUID();
  }

  getJwtSecret(): string {
    return getJwtSecret(this.configService);
  }
}
