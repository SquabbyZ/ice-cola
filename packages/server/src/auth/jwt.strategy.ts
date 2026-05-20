import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { getRequiredJwtSecret } from '../config/security-config';

interface JwtPayload {
  sub?: string;
}

interface AuthUserRow {
  id: string;
  email: string;
  teamId: string | null;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token subject');
    }

    const user = await this.db.findUserById(payload.sub) as AuthUserRow | null;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      teamId: user.teamId,
      role: user.role,
    };
  }
}
