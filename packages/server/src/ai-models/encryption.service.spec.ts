import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let mockConfigService: any;

  const validKeyHex = 'a'.repeat(64); // 32 bytes = 64 hex chars

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(validKeyHex),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('constructor', () => {
    it('throws error when AI_ENCRYPTION_KEY is not set', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile()
      ).rejects.toThrow('AI_ENCRYPTION_KEY environment variable is not set');
    });

    it('throws error when AI_ENCRYPTION_KEY is invalid length', async () => {
      mockConfigService.get.mockReturnValue('too-short');

      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile()
      ).rejects.toThrow('AI_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    });
  });

  describe('encrypt', () => {
    it('encrypts plaintext and returns encrypted data with iv and authTag', () => {
      const result = service.encrypt('test plaintext');

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(typeof result.encrypted).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.authTag).toBe('string');
      expect(result.encrypted).not.toBe('test plaintext');
    });

    it('produces different ciphertext each time (random IV)', () => {
      const result1 = service.encrypt('same plaintext');
      const result2 = service.encrypt('same plaintext');

      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.authTag).not.toBe(result2.authTag);
    });
  });

  describe('decrypt', () => {
    it('decrypts ciphertext back to original plaintext', () => {
      const original = 'sensitive data 123!@#';
      const { encrypted, iv, authTag } = service.encrypt(original);

      const decrypted = service.decrypt(encrypted, iv, authTag);

      expect(decrypted).toBe(original);
    });

    it('throws error with invalid authTag', () => {
      const { encrypted, iv } = service.encrypt('test');
      const wrongAuthTag = 'wrongauthtag123456'; // 16 bytes base64

      expect(() => {
        service.decrypt(encrypted, iv, wrongAuthTag);
      }).toThrow();
    });

    it('throws error with tampered ciphertext', () => {
      const { iv, authTag } = service.encrypt('test');
      const tampered = 'tampered' + 'a'.repeat(50);

      expect(() => {
        service.decrypt(tampered, iv, authTag);
      }).toThrow();
    });
  });

  describe('hashForLookup', () => {
    it('produces SHA256 hash of input', () => {
      const result = service.hashForLookup('test input');

      // SHA256 hash is 64 hex chars
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[a-f0-9]+$/);
    });

    it('produces consistent hash for same input', () => {
      const input = 'consistent input';

      const hash1 = service.hashForLookup(input);
      const hash2 = service.hashForLookup(input);

      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different inputs', () => {
      const hash1 = service.hashForLookup('input1');
      const hash2 = service.hashForLookup('input2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('handles empty string', () => {
      const { encrypted, iv, authTag } = service.encrypt('');
      const decrypted = service.decrypt(encrypted, iv, authTag);
      expect(decrypted).toBe('');
    });

    it('handles unicode characters', () => {
      const original = '中文测试 🔐 åäö';
      const { encrypted, iv, authTag } = service.encrypt(original);
      const decrypted = service.decrypt(encrypted, iv, authTag);
      expect(decrypted).toBe(original);
    });

    it('handles long text', () => {
      const original = 'a'.repeat(10000);
      const { encrypted, iv, authTag } = service.encrypt(original);
      const decrypted = service.decrypt(encrypted, iv, authTag);
      expect(decrypted).toBe(original);
    });

    it('handles special characters', () => {
      const original = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const { encrypted, iv, authTag } = service.encrypt(original);
      const decrypted = service.decrypt(encrypted, iv, authTag);
      expect(decrypted).toBe(original);
    });
  });
});