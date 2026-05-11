import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, CONFIG_KEYS } from './config.service';
import { DatabaseService } from '../database/database.service';

describe('ConfigService', () => {
  let service: ConfigService;
  let db: jest.Mocked<DatabaseService>;

  const mockConfig = {
    id: 'config-1',
    key: 'test_key',
    value: 'test_value',
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    db = module.get(DatabaseService);
  });

  describe('getConfig', () => {
    it('returns config when found', async () => {
      db.queryOne.mockResolvedValue(mockConfig);

      const result = await service.getConfig('test_key');

      expect(result).toEqual(mockConfig);
      expect(db.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM system_config WHERE key = $1',
        ['test_key']
      );
    });

    it('returns null when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.getConfig('nonexistent');

      expect(result).toBeNull();
    });

    it('masks sensitive values', async () => {
      const sensitiveConfig = {
        id: 'config-1',
        key: CONFIG_KEYS.RESEND_API_KEY,
        value: 'secret_api_key_12345',
        updatedAt: new Date(),
      };
      db.queryOne.mockResolvedValue(sensitiveConfig);

      const result = await service.getConfig(CONFIG_KEYS.RESEND_API_KEY);

      expect(result?.value).toBe('secr****2345');
    });

    it('does not mask non-sensitive values', async () => {
      const config = {
        id: 'config-1',
        key: CONFIG_KEYS.CLIENT_URL,
        value: 'http://localhost:5173',
        updatedAt: new Date(),
      };
      db.queryOne.mockResolvedValue(config);

      const result = await service.getConfig(CONFIG_KEYS.CLIENT_URL);

      expect(result?.value).toBe('http://localhost:5173');
    });

    it('masks short sensitive values', async () => {
      const sensitiveConfig = {
        id: 'config-1',
        key: CONFIG_KEYS.CAPTCHA_SECRET_KEY,
        value: 'short',
        updatedAt: new Date(),
      };
      db.queryOne.mockResolvedValue(sensitiveConfig);

      const result = await service.getConfig(CONFIG_KEYS.CAPTCHA_SECRET_KEY);

      expect(result?.value).toBe('****');
    });
  });

  describe('getAllConfigs', () => {
    it('returns all configs with masked sensitive values', async () => {
      const configs = [
        { id: 'config-1', key: CONFIG_KEYS.CLIENT_URL, value: 'http://localhost', updatedAt: new Date() },
        { id: 'config-2', key: CONFIG_KEYS.RESEND_API_KEY, value: 'secret_key_12345', updatedAt: new Date() },
      ];
      db.query.mockResolvedValue(configs);

      const result = await service.getAllConfigs();

      expect(result).toHaveLength(2);
      expect(result[1].value).toBe('secr****2345');
    });

    it('returns empty array when no configs', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.getAllConfigs();

      expect(result).toEqual([]);
    });
  });

  describe('setConfig', () => {
    it('sets config value and returns masked result', async () => {
      const resultRow = {
        id: 'new-config',
        key: 'new_key',
        value: '"some_value"',
        updatedAt: new Date(),
      };
      db.queryOne.mockResolvedValue(resultRow);

      const result = await service.setConfig('new_key', 'some_value');

      expect(result.key).toBe('new_key');
      expect(db.queryOne).toHaveBeenCalled();
    });

    it('stringifies object values', async () => {
      const resultRow = {
        id: 'new-config',
        key: 'object_key',
        value: '"{\\"a\\":1}"',
        updatedAt: new Date(),
      };
      db.queryOne.mockResolvedValue(resultRow);

      await service.setConfig('object_key', { a: 1 });

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_config'),
        ['object_key', '{"a":1}']
      );
    });
  });
});