import { ConfigService } from '@nestjs/config';
import { getRequiredAiEncryptionKey, getRequiredConfig, getRequiredJwtSecret } from './security-config';

describe('security-config', () => {
  function createConfigService(values: Record<string, string | undefined>): ConfigService {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  it('returns configured values', () => {
    const configService = createConfigService({ JWT_SECRET: 'local-secret' });

    expect(getRequiredConfig(configService, 'JWT_SECRET')).toBe('local-secret');
  });

  it('throws when a required value is missing', () => {
    const configService = createConfigService({});

    expect(() => getRequiredConfig(configService, 'JWT_SECRET')).toThrow(
      'JWT_SECRET environment variable is not set',
    );
  });

  it('throws when a required value is blank', () => {
    const configService = createConfigService({ JWT_SECRET: '   ' });

    expect(() => getRequiredConfig(configService, 'JWT_SECRET')).toThrow(
      'JWT_SECRET environment variable is not set',
    );
  });

  it('returns the required JWT secret', () => {
    const configService = createConfigService({ JWT_SECRET: 'jwt-secret' });

    expect(getRequiredJwtSecret(configService)).toBe('jwt-secret');
  });

  it('allows the local development JWT secret outside production', () => {
    const configService = createConfigService({
      JWT_SECRET: 'icecola-local-dev-jwt-secret-not-for-production',
      NODE_ENV: 'development',
    });

    expect(getRequiredJwtSecret(configService)).toBe('icecola-local-dev-jwt-secret-not-for-production');
  });

  it.each([
    'icecola-local-dev-jwt-secret-not-for-production',
    'icecola-dev-secret-change-in-production',
  ])('rejects known development JWT secret %s in production', (jwtSecret) => {
    const configService = createConfigService({
      JWT_SECRET: jwtSecret,
      NODE_ENV: 'production',
    });

    expect(() => getRequiredJwtSecret(configService)).toThrow(
      'JWT_SECRET must not use the local development default in production',
    );
  });

  it('returns the required AI encryption key', () => {
    const configService = createConfigService({ AI_ENCRYPTION_KEY: 'a'.repeat(64) });

    expect(getRequiredAiEncryptionKey(configService)).toBe('a'.repeat(64));
  });

  it('allows the local development AI encryption key outside production', () => {
    const configService = createConfigService({
      AI_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      NODE_ENV: 'development',
    });

    expect(getRequiredAiEncryptionKey(configService)).toBe(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
  });

  it('rejects the local development AI encryption key in production', () => {
    const configService = createConfigService({
      AI_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      NODE_ENV: 'production',
    });

    expect(() => getRequiredAiEncryptionKey(configService)).toThrow(
      'AI_ENCRYPTION_KEY must not use the local development default in production',
    );
  });
});
