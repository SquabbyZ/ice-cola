import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { CurrentAuthUser } from '../common/decorators/current-user.decorator';
import { getRequiredJwtSecret } from '../config/security-config';

interface AdminAccessTokenPayload {
  sub?: string;
  type?: string;
}

interface AdminAuthUserRow {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
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
      const payload = this.jwtService.verify<AdminAccessTokenPayload>(token, {
        secret: this.jwtSecret,
      });
      if (payload.type !== 'admin_access' || !payload.sub) {
        return false;
      }

      const admin = await this.db.queryOne<AdminAuthUserRow>(
        'SELECT id, email, role FROM admin_users WHERE id = $1',
        [payload.sub],
      );
      if (!admin) {
        return false;
      }

      (request as any).user = {
        sub: admin.id,
        id: admin.id,
        email: admin.email,
        role: admin.role,
        authType: 'admin',
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
