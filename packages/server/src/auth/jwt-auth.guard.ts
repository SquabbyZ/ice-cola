import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { CurrentAuthUser } from '../common/decorators/current-user.decorator';
import { getRequiredJwtSecret } from '../config/security-config';

interface AccessTokenPayload {
  sub?: string;
  type?: string;
}

interface AuthUserRow {
  id: string;
  email: string;
  teamId: string | null;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
      if (payload.type !== 'access' || !payload.sub) {
        return false;
      }

      const user = await this.db.findUserById(payload.sub) as AuthUserRow | null;
      if (!user) {
        return false;
      }

      (request as any).user = {
        sub: user.id,
        id: user.id,
        email: user.email,
        teamId: user.teamId,
        role: user.role,
      } satisfies CurrentAuthUser;
      return true;
    } catch {
      return false;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
