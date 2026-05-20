import { ConfigService } from '@nestjs/config';

const LOCAL_DEV_JWT_SECRET = 'icecola-local-dev-jwt-secret-not-for-production';
const LEGACY_DEV_JWT_SECRET = 'icecola-dev-secret-change-in-production';
const LOCAL_DEV_AI_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function getRequiredConfig(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key);

  if (!value || value.trim().length === 0) {
    throw new Error(`${key} environment variable is not set`);
  }

  return value;
}

export function getRequiredJwtSecret(configService: ConfigService): string {
  const secret = getRequiredConfig(configService, 'JWT_SECRET');

  if (isProduction(configService) && [LOCAL_DEV_JWT_SECRET, LEGACY_DEV_JWT_SECRET].includes(secret)) {
    throw new Error('JWT_SECRET must not use the local development default in production');
  }

  return secret;
}

export function getRequiredAiEncryptionKey(configService: ConfigService): string {
  const key = getRequiredConfig(configService, 'AI_ENCRYPTION_KEY');

  if (isProduction(configService) && key === LOCAL_DEV_AI_ENCRYPTION_KEY) {
    throw new Error('AI_ENCRYPTION_KEY must not use the local development default in production');
  }

  return key;
}

function isProduction(configService: ConfigService): boolean {
  return configService.get<string>('NODE_ENV') === 'production';
}
