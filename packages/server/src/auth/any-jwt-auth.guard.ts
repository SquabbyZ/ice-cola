import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { CurrentAuthUser } from '../common/decorators/current-user.decorator';
import { getRequiredJwtSecret } from '../config/security-config';

interface AccessTokenPayload {
  sub?: string;
  type?: string;
}

@Injectable()
export class AnyJwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.jwtSecret = getRequiredJwtSecret(configService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.jwtSecret,
      });

      if (!payload.sub) {
        return false;
      }

      if (payload.type === 'admin_access') {
        const admin = await this.db.queryOne<{ id: string; email: string; role: string }>(
          'SELECT id, email, role FROM admin_users WHERE id = $1',
          [payload.sub],
        );
        if (!admin) return false;

        (request as any).user = {
          sub: admin.id,
          id: admin.id,
          email: admin.email,
          role: admin.role,
          authType: 'admin',
        } satisfies CurrentAuthUser;
        return true;
      }

      if (payload.type === 'access') {
        const user = await this.db.queryOne<{ id: string; email: string; role: string }>(
          'SELECT id, email, role FROM users WHERE id = $1',
          [payload.sub],
        );
        if (!user) return false;

        (request as any).user = {
          sub: user.id,
          id: user.id,
          email: user.email,
          role: user.role,
          authType: 'user',
        } satisfies CurrentAuthUser;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
