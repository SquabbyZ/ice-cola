import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  updatedAt: Date;
}

export const CONFIG_KEYS = {
  RESEND_API_KEY: 'resend_api_key',
  RESEND_FROM_EMAIL: 'resend_from_email',
  CAPTCHA_SITE_KEY: 'captcha_site_key',
  CAPTCHA_SECRET_KEY: 'captcha_secret_key',
  CLIENT_URL: 'client_url',
  ADMIN_URL: 'admin_url',
} as const;

// Keys that should be masked when returned in API responses
const SENSITIVE_KEYS = new Set([
  CONFIG_KEYS.RESEND_API_KEY,
  CONFIG_KEYS.CAPTCHA_SECRET_KEY,
]);

@Injectable()
export class ConfigService {
  constructor(private db: DatabaseService) {}

  /**
   * Mask sensitive config value for API responses
   */
  private maskValue(key: string, value: any): any {
    if (!SENSITIVE_KEYS.has(key)) {
      return value;
    }

    if (typeof value === 'string' && value.length > 0) {
      // Show first 4 and last 4 characters, mask the rest
      if (value.length <= 8) {
        return '****';
      }
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }

    return value;
  }

  /**
   * Get a single config by key
   */
  async getConfig(key: string): Promise<SystemConfig | null> {
    const config = await this.db.queryOne<SystemConfig>(
      'SELECT * FROM system_config WHERE key = $1',
      [key]
    );

    if (config) {
      return {
        ...config,
        value: this.maskValue(key, config.value),
      };
    }

    return null;
  }

  /**
   * Get all configs
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    const configs = await this.db.query<SystemConfig>(
      'SELECT * FROM system_config ORDER BY key ASC'
    );

    return configs.map(config => ({
      ...config,
      value: this.maskValue(config.key, config.value),
    }));
  }

  /**
   * Set a config value (insert or update)
   */
  async setConfig(key: string, value: any): Promise<SystemConfig> {
    const result = await this.db.queryOne<SystemConfig>(
      `INSERT INTO system_config (id, key, value, "updatedAt")
       VALUES (uuid_generate_v4()::text, $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()
       RETURNING *`,
      [key, JSON.stringify(value)]
    );

    return {
      ...result,
      value: this.maskValue(key, result.value),
    };
  }
}