import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { ClientAuthService } from './client-auth.service';
import { DatabaseService } from '../database/database.service';
import { CaptchaService } from '../commons/captcha.service';
import { EmailService } from '../commons/email.service';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  let db: jest.Mocked<DatabaseService>;
  let jwtService: jest.Mocked<JwtService>;
  let captchaService: jest.Mocked<CaptchaService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    teamId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAuthService,
        {
          provide: DatabaseService,
          useValue: {
            findUserByEmail: jest.fn(),
            createUser: jest.fn(),
            createUserWithPersonalTeam: jest.fn(),
            deleteExpiredVerificationCodes: jest.fn(),
            createVerificationCode: jest.fn(),
            findValidVerificationCode: jest.fn(),
            findVerifiedVerificationCode: jest.fn(),
            findLatestVerificationCode: jest.fn(),
            incrementVerificationAttempts: jest.fn(),
            consumeVerifiedVerificationCode: jest.fn(),
            getVerificationCodeAttempts: jest.fn(),
            markVerificationCodeAsVerified: jest.fn(),
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CaptchaService,
          useValue: {
            verifyCaptcha: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientAuthService>(ClientAuthService);
    db = module.get(DatabaseService);
    jwtService = module.get(JwtService);
    captchaService = module.get(CaptchaService);
    emailService = module.get(EmailService);
  });

  describe('sendVerificationCode', () => {
    it('sends code after captcha verification', async () => {
      captchaService.verifyCaptcha.mockResolvedValue(true);
      db.findUserByEmail.mockResolvedValue(null);
      db.deleteExpiredVerificationCodes.mockResolvedValue([]);
      db.createVerificationCode.mockResolvedValue({} as any);
      emailService.sendVerificationCode.mockResolvedValue(undefined);

      await service.sendVerificationCode('new@example.com', 'captcha-token', ['a', 'b', 'c', 'd'], '127.0.0.1');

      expect(captchaService.verifyCaptcha).toHaveBeenCalledWith('captcha-token', ['a', 'b', 'c', 'd']);
      expect(emailService.sendVerificationCode).toHaveBeenCalled();
    });

    it('throws error when captcha is invalid', async () => {
      captchaService.verifyCaptcha.mockResolvedValue(false);

      await expect(
        service.sendVerificationCode('new@example.com', 'invalid-token', ['a', 'b', 'c', 'd'])
      ).rejects.toThrow('图形验证码错误或已过期');
    });

    it('throws error when email already exists', async () => {
      captchaService.verifyCaptcha.mockResolvedValue(true);
      db.findUserByEmail.mockResolvedValue(mockUser);

      await expect(
        service.sendVerificationCode('test@example.com', 'captcha-token', ['a', 'b', 'c', 'd'])
      ).rejects.toThrow('邮箱已被注册');
    });
  });

  describe('verifyCode', () => {
    it('returns true for valid code', async () => {
      const mockRecord = { id: 'record-1', email: 'test@example.com', code: '123456' };
      db.findValidVerificationCode.mockResolvedValue(mockRecord as any);
      db.markVerificationCodeAsVerified.mockResolvedValue({} as any);

      const result = await service.verifyCode('test@example.com', '123456');

      expect(result).toBe(true);
      expect(db.markVerificationCodeAsVerified).toHaveBeenCalledWith('record-1');
    });

    it('returns false for invalid code', async () => {
      db.findValidVerificationCode.mockResolvedValue(null);
      db.getVerificationCodeAttempts.mockResolvedValue(0);

      const result = await service.verifyCode('test@example.com', 'wrong');

      expect(result).toBe(false);
    });

    it('throws error when too many attempts', async () => {
      db.findValidVerificationCode.mockResolvedValue(null);
      db.findLatestVerificationCode.mockResolvedValue({ id: 'record-1', attempts: 2 } as any);
      db.incrementVerificationAttempts.mockResolvedValue({ attempts: 3 } as any);

      await expect(
        service.verifyCode('test@example.com', 'wrong')
      ).rejects.toThrow('验证码错误次数过多，请重新获取');
    });

    it('rate limits verification attempts by client IP', async () => {
      db.findValidVerificationCode.mockResolvedValue(null);
      db.findLatestVerificationCode.mockResolvedValue(null);

      await service.verifyCode('test@example.com', 'wrong', '127.0.0.1');
      await service.verifyCode('test@example.com', 'wrong', '127.0.0.1');

      await expect(
        service.verifyCode('test@example.com', 'wrong', '127.0.0.1')
      ).rejects.toThrow('注册过于频繁');
    });
  });

  describe('registerWithVerification', () => {
    it('registers successfully with verified email', async () => {
      db.consumeVerifiedVerificationCode.mockResolvedValue({ verificationCode: { id: 'code-1' } } as any);
      db.findUserByEmail.mockResolvedValue(null);
      db.createUserWithPersonalTeam.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
        teamId: 'team-1',
        team_name: 'Test Team',
        role: 'OWNER',
      } as any);
      db.markVerificationCodeAsVerified.mockResolvedValue({} as any);
      jwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.registerWithVerification({
        email: 'new@example.com',
        code: '123456',
        password: 'Password123',
        name: 'New User',
      });

      expect(db.createUserWithPersonalTeam).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: expect.any(String),
        name: 'New User',
      });
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.team?.id).toBe('team-1');
      expect(result.accessToken).toBe('mock-token');
    });

    it('throws error when email not verified', async () => {
      // No verification in cache
      db.consumeVerifiedVerificationCode.mockResolvedValue(null);

      await expect(
        service.registerWithVerification({
          email: 'new@example.com',
          code: '123456',
          password: 'Password123',
          name: 'New User',
        })
      ).rejects.toThrow('请先完成邮箱验证');
    });

    it('throws error when email already exists', async () => {
      db.consumeVerifiedVerificationCode.mockResolvedValue({ verificationCode: { id: 'code-1' } } as any);
      db.findUserByEmail.mockResolvedValue(mockUser);

      await expect(
        service.registerWithVerification({
          email: 'test@example.com',
          code: '123456',
          password: 'Password123',
          name: 'New User',
        })
      ).rejects.toThrow('邮箱已被注册');
    });
  });

  describe('rate limiting', () => {
    it('blocks registration when rate limit exceeded', async () => {
      // Simulate rate limit by calling multiple times
      captchaService.verifyCaptcha.mockResolvedValue(true);
      db.findUserByEmail.mockResolvedValue(null);
      db.deleteExpiredVerificationCodes.mockResolvedValue([]);
      db.createVerificationCode.mockResolvedValue({} as any);
      emailService.sendVerificationCode.mockResolvedValue(undefined);

      // First two should succeed (RATE_LIMIT_MAX = 2)
      await service.sendVerificationCode('new1@example.com', 'token', ['a', 'b', 'c', 'd']);
      await service.sendVerificationCode('new2@example.com', 'token', ['a', 'b', 'c', 'd']);

      // Third should fail
      await expect(
        service.sendVerificationCode('new3@example.com', 'token', ['a', 'b', 'c', 'd'])
      ).rejects.toThrow('注册过于频繁');
    });
  });

  describe('generateCode', () => {
    it('generates 6-digit code', () => {
      const code = (service as any).generateCode();

      expect(code).toMatch(/^\d{6}$/);
      expect(parseInt(code, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code, 10)).toBeLessThanOrEqual(999999);
    });
  });
});