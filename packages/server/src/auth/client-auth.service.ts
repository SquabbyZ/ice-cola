import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
  ): Promise<void> {
    // Check rate limit first
    const clientIp = 'unknown'; // In production, get from request
    this.checkRateLimit(clientIp);

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
  async verifyCode(email: string, code: string): Promise<boolean> {
    // Find valid code in database
    const record = await this.db.findValidVerificationCode(email, code, 'register');

    if (!record) {
      // Check attempts to see if we should suggest re-sending
      const attempts = await this.db.getVerificationCodeAttempts(email, 'register');
      if (attempts >= this.MAX_ATTEMPTS) {
        throw new AppError('TOO_MANY_ATTEMPTS', '验证码错误次数过多，请重新获取', 400);
      }
      return false;
    }

    // Mark as verified
    await this.db.markVerificationCodeAsVerified(record.id);

    // Cache the verification status
    this.verifiedCache.set(email, {
      verified: true,
      codeId: record.id,
    });

    this.logger.log(`Email ${email} verified successfully`);
    return true;
  }

  /**
   * Register with email verification
   */
  async registerWithVerification(dto: ClientRegisterDto): Promise<{
    user: { id: string; email: string; name: string };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Check rate limit
    const clientIp = 'unknown';
    this.checkRateLimit(clientIp);

    // Check if email is verified (set by verifyCode)
    const verificationStatus = this.verifiedCache.get(dto.email);
    if (!verificationStatus?.verified) {
      throw new AppError('EMAIL_NOT_VERIFIED', '请先完成邮箱验证', 400);
    }

    // Check if user already exists
    const existing = await this.db.findUserByEmail(dto.email);
    if (existing) {
      throw new AppError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 400);
    }

    // Hash password and create user
    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.db.createUser({
      email: dto.email,
      password,
      name: dto.name,
    }) as any;

    // Generate tokens
    const tokens = await this.generateTokens(user.id, null, 'MEMBER');

    // Clean up verification record
    await this.db.markVerificationCodeAsVerified(verificationStatus.codeId);
    this.verifiedCache.delete(dto.email);

    this.logger.log(`User ${dto.email} registered successfully`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Check rate limit for IP
   */
  private checkRateLimit(ip: string): void {
    const now = new Date();
    const entry = this.rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      // Create new entry
      this.rateLimitStore.set(ip, {
        count: 1,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW_MS),
      });
      return;
    }

    if (entry.count >= this.RATE_LIMIT_MAX) {
      throw new AppError(
        'RATE_LIMIT_EXCEEDED',
        `注册过于频繁，请 ${Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000)} 秒后重试`,
        429,
      );
    }

    entry.count++;
  }

  /**
   * Generate 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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