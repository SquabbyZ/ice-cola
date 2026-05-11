import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiModelsService } from './ai-models.service';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from './encryption.service';
import { HttpService } from '@nestjs/axios';

describe('AiModelsService', () => {
  let service: AiModelsService;
  let db: jest.Mocked<DatabaseService>;
  let encryption: jest.Mocked<EncryptionService>;
  let httpService: jest.Mocked<HttpService>;

  const mockProvider = {
    id: 'provider-1',
    name: 'OpenAI',
    code: 'openai',
    logo_url: 'https://openai.com/logo.png',
    website_url: 'https://openai.com',
    description: 'OpenAI provider',
    sort_order: 1,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockModel = {
    id: 'model-1',
    provider_id: 'provider-1',
    name: 'GPT-4',
    model_id: 'gpt-4',
    description: 'GPT-4 model',
    capabilities: { type: 'chat', contextWindow: 128000 },
    pricing: { inputPricePer1m: 30, outputPricePer1m: 60 },
    sort_order: 1,
    enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockApiKey = {
    id: 'key-1',
    provider_id: 'provider-1',
    key_name: 'Test Key',
    key_hash: 'hash123',
    encrypted_key: 'enc123',
    iv: 'iv123',
    auth_tag: 'tag123',
    is_active: true,
    expires_at: null,
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiModelsService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            hashForLookup: jest.fn(),
            encrypt: jest.fn().mockReturnValue({ encrypted: 'enc', iv: 'iv', authTag: 'tag' }),
            decrypt: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiModelsService>(AiModelsService);
    db = module.get(DatabaseService);
    encryption = module.get(EncryptionService);
    httpService = module.get(HttpService);
  });

  describe('Provider CRUD', () => {
    describe('createProvider', () => {
      it('creates a provider', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.createProvider({
          name: 'OpenAI',
          code: 'openai',
        });

        expect(result).toEqual(mockProvider);
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO ai_providers'),
          expect.any(Array)
        );
      });

      it('creates provider with all fields', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.createProvider({
          name: 'OpenAI',
          code: 'openai',
          logoUrl: 'https://openai.com/logo.png',
          websiteUrl: 'https://openai.com',
          description: 'OpenAI provider',
          sortOrder: 1,
        });

        expect(result).toEqual(mockProvider);
      });
    });

    describe('findAllProviders', () => {
      it('returns all providers', async () => {
        const providers = [mockProvider];
        db.query.mockResolvedValue(providers);

        const result = await service.findAllProviders();

        expect(result).toEqual(providers);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM ai_providers')
        );
      });

      it('returns empty array when no providers', async () => {
        db.query.mockResolvedValue([]);

        const result = await service.findAllProviders();

        expect(result).toEqual([]);
      });
    });

    describe('findProviderById', () => {
      it('returns provider when found', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.findProviderById('provider-1');

        expect(result).toEqual(mockProvider);
      });

      it('returns null when not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findProviderById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findProviderByCode', () => {
      it('returns provider by code', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.findProviderByCode('openai');

        expect(result).toEqual(mockProvider);
      });
    });

    describe('updateProvider', () => {
      it('updates provider name', async () => {
        const updated = { ...mockProvider, name: 'Updated OpenAI' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', { name: 'Updated OpenAI' });

        expect(result?.name).toBe('Updated OpenAI');
      });

      it('returns existing provider when no updates', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.updateProvider('provider-1', {});

        expect(result).toEqual(mockProvider);
      });

      it('updates multiple fields', async () => {
        const updated = { ...mockProvider, name: 'Updated', description: 'New desc' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', {
          name: 'Updated',
          description: 'New desc',
        });

        expect(result?.name).toBe('Updated');
        expect(result?.description).toBe('New desc');
      });
    });

    describe('deleteProvider', () => {
      it('deletes provider', async () => {
        db.queryOne.mockResolvedValue(mockProvider);

        const result = await service.deleteProvider('provider-1');

        expect(result).toEqual(mockProvider);
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM ai_providers'),
          ['provider-1']
        );
      });
    });
  });

  describe('Model CRUD', () => {
    describe('createModel', () => {
      it('creates a model', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.createModel({
          providerId: 'provider-1',
          name: 'GPT-4',
          modelId: 'gpt-4',
          modelType: 'chat',
        });

        expect(result).toEqual(mockModel);
      });

      it('creates model with pricing', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.createModel({
          providerId: 'provider-1',
          name: 'GPT-4',
          modelId: 'gpt-4',
          modelType: 'chat',
          inputPricePer1m: 30,
          outputPricePer1m: 60,
        });

        expect(result).toEqual(mockModel);
      });
    });

    describe('findModelsByProvider', () => {
      it('returns models for provider', async () => {
        db.query.mockResolvedValue([mockModel]);

        const result = await service.findModelsByProvider('provider-1');

        expect(result).toEqual([mockModel]);
      });
    });

    describe('findAllModels', () => {
      it('returns all models with provider info', async () => {
        db.query.mockResolvedValue([mockModel]);

        const result = await service.findAllModels();

        expect(result).toEqual([mockModel]);
      });
    });

    describe('findModelById', () => {
      it('returns model when found', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.findModelById('model-1');

        expect(result).toEqual(mockModel);
      });
    });

    describe('updateModel', () => {
      it('updates model name', async () => {
        const updated = { ...mockModel, name: 'Updated GPT-4' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModel('model-1', { name: 'Updated GPT-4' });

        expect(result?.name).toBe('Updated GPT-4');
      });

      it('returns existing model when no updates', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.updateModel('model-1', {});

        expect(result).toEqual(mockModel);
      });
    });

    describe('deleteModel', () => {
      it('deletes model', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.deleteModel('model-1');

        expect(result).toEqual(mockModel);
      });
    });
  });

  describe('ApiKey operations', () => {
    describe('createApiKey', () => {
      it('creates api key with encrypted value', async () => {
        db.queryOne.mockResolvedValue(mockApiKey);

        const result = await service.createApiKey({
          providerId: 'provider-1',
          keyName: 'Test Key',
          apiKey: 'sk-test123',
        }, 'user-1');

        expect(result).toEqual(mockApiKey);
        expect(encryption.hashForLookup).toHaveBeenCalledWith('sk-test123');
        expect(encryption.encrypt).toHaveBeenCalledWith('sk-test123');
      });
    });

    describe('findActiveApiKeyByProvider', () => {
      it('returns active api key', async () => {
        db.queryOne.mockResolvedValue(mockApiKey);

        const result = await service.findActiveApiKeyByProvider('provider-1');

        expect(result).toEqual(mockApiKey);
      });

      it('returns null when no active key', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findActiveApiKeyByProvider('provider-1');

        expect(result).toBeNull();
      });
    });

    describe('getDecryptedApiKey', () => {
      it('returns decrypted key', async () => {
        db.queryOne.mockResolvedValue(mockApiKey);
        encryption.decrypt.mockReturnValue('sk-test123');

        const result = await service.getDecryptedApiKey('key-1');

        expect(result).toBe('sk-test123');
      });

      it('returns null when key not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.getDecryptedApiKey('nonexistent');

        expect(result).toBeNull();
      });

      it('returns null when decryption fails', async () => {
        db.queryOne.mockResolvedValue(mockApiKey);
        encryption.decrypt.mockImplementation(() => { throw new Error('Decrypt failed'); });

        const result = await service.getDecryptedApiKey('key-1');

        expect(result).toBeNull();
      });
    });

    describe('updateApiKeyStatus', () => {
      it('updates key status', async () => {
        const updated = { ...mockApiKey, is_active: false };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateApiKeyStatus('key-1', { isActive: false });

        expect(result?.is_active).toBe(false);
      });
    });

    describe('deleteApiKey', () => {
      it('deletes api key', async () => {
        db.queryOne.mockResolvedValue(mockApiKey);

        const result = await service.deleteApiKey('key-1');

        expect(result).toEqual(mockApiKey);
      });
    });
  });

  describe('fetchModelsFromProvider', () => {
    it('throws when provider not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.fetchModelsFromProvider('nonexistent'))
        .rejects.toThrow(HttpException);
    });

    it('throws when no active API key', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(null); // findActiveApiKeyByProvider

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });

    it('throws when API key decryption fails', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(mockApiKey) // findActiveApiKeyByProvider
        .mockResolvedValueOnce(mockApiKey); // getDecryptedApiKey query
      encryption.decrypt.mockReturnValue(null); // decryption returns null

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });
  });
});