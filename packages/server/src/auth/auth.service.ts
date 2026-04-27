import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { AppError } from '../common/interfaces/errors';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserRow {
  id: string;
  email: string;
  password: string;
  name: string | null;
  teamId: string | null;
  role: string;
  team_name: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.findUserByEmail(dto.email);

    if (existing) {
      throw new AppError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 400);
    }

    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.db.createUser({
      email: dto.email,
      password,
      name: dto.name,
    }) as UserRow;

    const tokens = await this.generateTokens(user.id, user.teamId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date(),
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.db.findUserByEmail(dto.email) as UserRow | null;

    if (!user) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const tokens = await this.generateTokens(user.id, user.teamId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        team: user.teamId
          ? {
              id: user.teamId,
              name: user.team_name,
              role: user.role,
            }
          : null,
      },
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new AppError('AUTH_TOKEN_INVALID', '无效的刷新令牌', 401);
      }

      const user = await this.db.queryOne<UserRow>(
        'SELECT * FROM users WHERE id = $1',
        [payload.sub]
      );

      if (!user) {
        throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
      }

      const tokens = await this.generateTokens(user.id, user.teamId, user.role);

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('AUTH_REFRESH_FAILED', '刷新令牌失败', 401);
    }
  }

  async logout(userId: string) {
    return { success: true };
  }

  private async generateTokens(
    userId: string,
    teamId: string | null,
    role: string,
  ) {
    const payload = {
      sub: userId,
      teamId: teamId || '',
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, type: 'access' }),
      this.jwtService.signAsync({ ...payload, type: 'refresh' }, {
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}