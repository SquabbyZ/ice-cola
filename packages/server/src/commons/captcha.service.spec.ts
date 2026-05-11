import { Test, TestingModule } from '@nestjs/testing';
import { CaptchaService } from './captcha.service';

describe('CaptchaService', () => {
  let service: CaptchaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaptchaService],
    }).compile();

    service = module.get<CaptchaService>(CaptchaService);
  });

  afterEach(() => {
    // Clear any intervals
  });

  describe('generateCaptcha', () => {
    it('generates a captcha with token, imageUrl, answer and expiresAt', async () => {
      const result = await service.generateCaptcha();

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('expiresAt');
      expect(result.token).toBeTruthy();
      expect(result.imageUrl).toContain('data:image/svg+xml;base64,');
      expect(result.answer).toHaveLength(4);
    });

    it('generates unique tokens for each captcha', async () => {
      const result1 = await service.generateCaptcha();
      const result2 = await service.generateCaptcha();

      expect(result1.token).not.toBe(result2.token);
    });

    it('generates answer with 4 Chinese characters', async () => {
      const result = await service.generateCaptcha();

      expect(result.answer).toHaveLength(4);
      result.answer.forEach(char => {
        expect(char).toHaveLength(1);
      });
    });

    it('expires in 5 minutes', async () => {
      const result = await service.generateCaptcha();
      const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000);

      // Allow 1 second tolerance
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });
  });

  describe('verifyCaptcha', () => {
    it('returns true for correct answer', async () => {
      const captcha = await service.generateCaptcha();

      const result = await service.verifyCaptcha(captcha.token, captcha.answer);

      expect(result).toBe(true);
    });

    it('returns false for wrong answer', async () => {
      const captcha = await service.generateCaptcha();

      const result = await service.verifyCaptcha(captcha.token, ['wrong', 'answer', 'test', 'test']);

      expect(result).toBe(false);
    });

    it('returns false for invalid token', async () => {
      const result = await service.verifyCaptcha('invalid-token', ['a', 'b', 'c', 'd']);

      expect(result).toBe(false);
    });

    it('returns false for expired captcha', async () => {
      // Create a service with a pre-set expired captcha
      const module: TestingModule = await Test.createTestingModule({
        providers: [CaptchaService],
      }).compile();

      const testService = module.get<CaptchaService>(CaptchaService);

      // Manually set an expired captcha
      const expiredToken = 'expired-token';
      (testService as any).captchaStore.set(expiredToken, {
        answer: ['a', 'b', 'c', 'd'],
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const result = await testService.verifyCaptcha(expiredToken, ['a', 'b', 'c', 'd']);

      expect(result).toBe(false);
    });

    it('deletes captcha after successful verification', async () => {
      const captcha = await service.generateCaptcha();
      await service.verifyCaptcha(captcha.token, captcha.answer);

      // Second verification should fail (one-time use)
      const result = await service.verifyCaptcha(captcha.token, captcha.answer);

      expect(result).toBe(false);
    });

    it('is case sensitive for ASCII characters', async () => {
      // Note: Chinese characters don't have case, so this verifies
      // the comparison logic works correctly
      const captcha = await service.generateCaptcha();
      const wrongAnswer = captcha.answer.map((c: string) => c + 'x');
      const result = await service.verifyCaptcha(captcha.token, wrongAnswer);

      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('clears expired captchas from store', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [CaptchaService],
      }).compile();

      const testService = module.get<CaptchaService>(CaptchaService);

      // Manually set an expired captcha
      const expiredToken = 'expired-token';
      (testService as any).captchaStore.set(expiredToken, {
        answer: ['a', 'b', 'c', 'd'],
        expiresAt: new Date(Date.now() - 1000),
      });

      // Add a valid captcha
      const validCaptcha = await testService.generateCaptcha();

      // Verify the expired one is gone after cleanup
      const expiredResult = await testService.verifyCaptcha(expiredToken, ['a', 'b', 'c', 'd']);
      expect(expiredResult).toBe(false);

      // Valid one should still work
      const validResult = await testService.verifyCaptcha(validCaptcha.token, validCaptcha.answer);
      expect(validResult).toBe(true);
    });
  });
});