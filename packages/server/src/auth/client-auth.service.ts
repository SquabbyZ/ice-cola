import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CaptchaService } from '../commons/captcha.service';
import { EmailService } from '../commons/email.service';
import { ClientRegisterDto } from './client-dto/client-auth.dto';
import { AppError } from '../common/interfaces/errors';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

interface VerificationStatus {
  verified: boolean;
  codeId: string;
  code: string;
}

@Injectable()
export class ClientAuthService {
  private readonly logger = new Logger(ClientAuthService.name);

  // Rate limiting: IP -> { count, resetAt }
  private rateLimitStore = new Map<string, RateLimitEntry>();

  // Verification status cache: email -> { verified, codeId }
  // Tracks which emails have been verified (but codeId is in DB)
  private verifiedCache = new Map<string, VerificationStatus>();

  // Code expiry time in milliseconds (5 minutes)
  private readonly CODE_EXPIRY_MS = 5 * 60 * 1000;

  // Max verification attempts before requiring re-verification
  private readonly MAX_ATTEMPTS = 3;

  // Rate limit: max registrations per IP per minute
  private readonly RATE_LIMIT_MAX = 2;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000;

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private captchaService: CaptchaService,
    private emailService: EmailService,
  ) {}

  /**
   * Send verification code to email after captcha verification
   */
  async sendVerificationCode(
    email: string,
    captchaToken: string,
    captchaAnswer: string[],
    clientIp = 'unknown',
  ): Promise<void> {
    // Check rate limit first
    this.checkRateLimit(clientIp, 'send-code');

    // Verify captcha
    const isCaptchaValid = await this.captchaService.verifyCaptcha(captchaToken, captchaAnswer);
    if (!isCaptchaValid) {
      throw new AppError('INVALID_CAPTCHA', '图形验证码错误或已过期', 400);
    }

    // Check if email already registered
    const existing = await this.db.findUserByEmail(email);
    if (existing) {
      throw new AppError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 400);
    }

    // Delete any existing expired codes for this email
    await this.db.deleteExpiredVerificationCodes(email);

    // Generate 6-digit code
    const code = this.generateCode();

    // Store in database
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MS);
    await this.db.createVerificationCode({
      email,
      code,
      type: 'register',
      expiresAt,
    });

    // Send email
    await this.emailService.sendVerificationCode(email, code);

    this.logger.log(`Verification code sent to ${email}`);
  }

  /**
   * Verify email code
   */
  async verifyCode(email: string, code: string, clientIp = 'unknown', type = 'register'): Promise<boolean> {
    this.checkRateLimit(clientIp, 'verify-code');

    // Find valid code in database
    const record = await this.db.findValidVerificationCode(email, code, type);

    if (!record) {
      const latestRecord = await this.db.findLatestVerificationCode(email, type);
      if (latestRecord) {
        const updatedRecord = await this.db.incrementVerificationAttempts(latestRecord.id);
        const attempts = Number(updatedRecord?.attempts || latestRecord.attempts || 0);
        if (attempts >= this.MAX_ATTEMPTS) {
          throw new AppError('TOO_MANY_ATTEMPTS', '验证码错误次数过多，请重新获取', 400);
        }
      }
      return false;
    }

    // Mark as verified
    await this.db.markVerificationCodeAsVerified(record.id);

    // Cache the verification status
    this.verifiedCache.set(email, {
      verified: true,
      codeId: record.id,
      code,
    });

    this.logger.log(`Email ${email} verified successfully`);
    return true;
  }

  /**
   * Register with email verification
   */
  async registerWithVerification(dto: ClientRegisterDto, clientIp = 'unknown'): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
      team: { id: string; name: string; role: string } | null;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Check rate limit
    this.checkRateLimit(clientIp, 'register');

    const existing = await this.db.findUserByEmail(dto.email);
    if (existing) {
      throw new AppError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 400);
    }

    const result = await this.db.consumeVerifiedVerificationCode(dto.email, dto.code, 'register');

    if (!result) {
      throw new AppError('EMAIL_NOT_VERIFIED', '请先完成邮箱验证', 400);
    }

    // Hash password and create user
    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.db.createUserWithPersonalTeam({
      email: dto.email,
      password,
      name: dto.name,
    }) as any;

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.teamId, user.role);

    this.verifiedCache.delete(dto.email);

    this.logger.log(`User ${dto.email} registered successfully`);

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

  /**
   * Check rate limit for IP with operation-specific key
   */
  private checkRateLimit(ip: string, operation: string = 'default'): void {
    const key = `${ip}:${operation}`;
    const now = new Date();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW_MS),
      });
      return;
    }

    if (entry.count >= this.RATE_LIMIT_MAX) {
      throw new AppError(
        'RATE_LIMIT_EXCEEDED',
        `操作过于频繁，请 ${Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)} 秒后重试`,
        429,
      );
    }

    entry.count++;
  }

  // ========== Password Reset ==========

  /**
   * Send reset password code to email after captcha verification
   * Silently returns if email not found (does not reveal existence)
   */
  async sendResetPasswordCode(
    email: string,
    captchaToken: string,
    captchaAnswer: string[],
    clientIp = 'unknown',
  ): Promise<void> {
    this.checkRateLimit(clientIp, 'reset-send');

    const isCaptchaValid = await this.captchaService.verifyCaptcha(captchaToken, captchaAnswer);
    if (!isCaptchaValid) {
      throw new AppError('INVALID_CAPTCHA', '图形验证码错误或已过期', 400);
    }

    // Silently return if user not found — don't reveal email existence
    const user = await this.db.findUserByEmail(email);
    if (!user) {
      return;
    }

    await this.db.deleteExpiredVerificationCodes(email);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.db.createVerificationCode({
      email,
      code,
      type: 'reset_password',
      expiresAt,
    });

    await this.emailService.sendVerificationCode(email, code);

    this.logger.log(`Password reset code sent to ${email}`);
  }

  /**
   * Verify reset code and set new password
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    clientIp = 'unknown',
  ): Promise<void> {
    this.checkRateLimit(clientIp, 'reset-verify');

    const user = await this.db.findUserByEmail(email);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    // Verify the reset code (must be already verified by verifyCode step)
    const record = await this.db.findVerifiedVerificationCode(email, code, 'reset_password');
    if (!record) {
      throw new AppError('INVALID_CODE', '验证码无效或已过期', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.db.query(
      `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
      [hashedPassword, user.id],
    );

    // Delete the used code
    await this.db.query(
      `DELETE FROM client_verification_codes WHERE email = $1 AND type = 'reset_password'`,
      [email],
    );

    this.logger.log(`Password reset successfully for ${email}`);
  }

  /**
   * Generate 6-digit verification code
   */
  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Generate JWT tokens
   */
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