import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AiModelsService } from './ai-models.service';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from './encryption.service';
import { AiApiClient } from './api-client';

describe('AiModelsService', () => {
  let service: AiModelsService;
  let db: jest.Mocked<DatabaseService>;
  let encryption: jest.Mocked<EncryptionService>;
  let apiClient: jest.Mocked<AiApiClient>;

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

  const mockSafeApiKey = {
    id: 'key-1',
    provider_id: 'provider-1',
    key_name: 'Test Key',
    is_active: true,
    last_used_at: null,
    expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  function expectSafeApiKey(result: Record<string, unknown> | null | undefined): void {
    expect(result).toBeDefined();
    expect(result).not.toHaveProperty('key_hash');
    expect(result).not.toHaveProperty('encrypted_key');
    expect(result).not.toHaveProperty('iv');
    expect(result).not.toHaveProperty('auth_tag');
    expect(result).not.toHaveProperty('apiKey');
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiModelsService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
            transaction: jest.fn(),
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
          provide: AiApiClient,
          useValue: {
            fetchModels: jest.fn(),
            chatCompletion: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiModelsService>(AiModelsService);
    db = module.get(DatabaseService);
    const transactionQueryAdapter = async (text: string, params?: unknown[]) => {
      const normalizedText = text.trim();

      if (
        normalizedText.startsWith('SELECT * FROM ai_models WHERE id = $1') ||
        normalizedText.startsWith('INSERT INTO ai_models')
      ) {
        const row = await db.queryOne(text, params);
        if (row) return { rows: [row] };
      }

      const rows = await db.query(text, params);
      if (rows !== undefined) return { rows };

      if (normalizedText.startsWith('UPDATE ai_models')) {
        const row = await db.queryOne(text, params);
        if (row) return { rows: [row] };
      }

      return { rows: [] };
    };
    db.transaction.mockImplementation(async (callback) =>
      callback({ query: transactionQueryAdapter } as never),
    );
    encryption = module.get(EncryptionService);
    apiClient = module.get(AiApiClient);
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

      it('returns null when provider not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findProviderByCode('nonexistent');

        expect(result).toBeNull();
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

      it('updates provider logoUrl', async () => {
        const updated = { ...mockProvider, logo_url: 'https://new.logo.png' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', { logoUrl: 'https://new.logo.png' });

        expect(result?.logo_url).toBe('https://new.logo.png');
      });

      it('updates provider websiteUrl', async () => {
        const updated = { ...mockProvider, website_url: 'https://new.website.com' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', { websiteUrl: 'https://new.website.com' });

        expect(result?.website_url).toBe('https://new.website.com');
      });

      it('updates provider sortOrder', async () => {
        const updated = { ...mockProvider, sort_order: 10 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', { sortOrder: 10 });

        expect(result?.sort_order).toBe(10);
      });

      it('updates provider status', async () => {
        const updated = { ...mockProvider, status: 'inactive' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateProvider('provider-1', { status: 'inactive' });

        expect(result?.status).toBe('inactive');
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

      it('creates a model and upserts its client catalog projection in one transaction', async () => {
        const createdModel = {
          ...mockModel,
          status: 'active',
          enabled: true,
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [createdModel] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const createModelInput = {
          providerId: 'provider-1',
          name: 'GPT-4',
          modelId: 'gpt-4',
          modelType: 'chat',
          description: 'GPT-4 model',
          contextWindow: 128000,
          inputPricePer1m: 30,
          outputPricePer1m: 60,
          sortOrder: 1,
          capabilities: ['chat', 'streaming'],
          displayName: 'GPT-4 Client',
          rank: 2,
          costMultiplier: 1.5,
          requiredPlanLevel: 1,
          isCatalogVisible: true,
        } as Parameters<typeof service.createModel>[0] & {
          displayName: string;
          rank: number;
          costMultiplier: number;
          requiredPlanLevel: number;
          isCatalogVisible: boolean;
        };

        const result = await service.createModel(createModelInput);

        expect(result).toEqual(createdModel);
        expect(db.transaction).toHaveBeenCalledTimes(1);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO ai_models'),
          expect.arrayContaining(['provider-1', 'GPT-4', 'gpt-4']),
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO model_catalog'),
          expect.arrayContaining([
            'provider-1',
            'gpt-4',
            'GPT-4 Client',
            'GPT-4 model',
            2,
            1.5,
            1,
            true,
          ]),
        );
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

      it('returns null when model not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findModelById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findModelByProviderAndModelId', () => {
      it('returns model by provider and model id', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        const result = await service.findModelByProviderAndModelId('provider-1', 'gpt-4');

        expect(result).toEqual(mockModel);
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('provider_id'),
          ['provider-1', 'gpt-4'],
        );
      });

      it('returns null when not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findModelByProviderAndModelId('provider-1', 'nonexistent');

        expect(result).toBeNull();
      });

      it('finds executable active models by provider model id', async () => {
        db.queryOne.mockResolvedValue(mockModel);

        await service.findExecutableModelByModelId('gpt-4');

        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining("WHERE m.model_id = $1 AND m.status = 'active'"),
          ['gpt-4'],
        );
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

      it('updates multiple fields including contextWindow and pricing', async () => {
        const updated = { ...mockModel, name: 'Updated GPT-4', context_window: 200000 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModel('model-1', {
          name: 'Updated GPT-4',
          contextWindow: 200000,
          inputPricePer1m: 15,
          outputPricePer1m: 30,
        });

        expect(result?.name).toBe('Updated GPT-4');
        expect(result?.context_window).toBe(200000);
      });

      it('updates model capabilities', async () => {
        const updated = { ...mockModel, capabilities: JSON.stringify(['chat', 'embedding']) };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModel('model-1', {
          capabilities: ['chat', 'embedding'],
        });

        expect(result).toBeDefined();
      });

      it('updates model status', async () => {
        const updated = { ...mockModel, status: 'inactive' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModel('model-1', { status: 'inactive' });

        expect(result?.status).toBe('inactive');
      });

      it('updates a model and synchronizes catalog display fields', async () => {
        const existingModel = {
          ...mockModel,
          status: 'active',
        };
        const updatedModel = {
          ...existingModel,
          name: 'GPT-4 Turbo',
          description: 'Updated description',
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [existingModel] })
          .mockResolvedValueOnce({ rows: [updatedModel] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const updateModelInput = {
          name: 'GPT-4 Turbo',
          description: 'Updated description',
          displayName: 'Turbo Client',
          rank: 3,
          costMultiplier: 2,
          requiredPlanLevel: 2,
          isCatalogVisible: false,
        } as Parameters<typeof service.updateModel>[1] & {
          displayName: string;
          rank: number;
          costMultiplier: number;
          requiredPlanLevel: number;
          isCatalogVisible: boolean;
        };

        const result = await service.updateModel('model-1', updateModelInput);

        expect(result).toEqual(updatedModel);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM ai_models WHERE id = $1'),
          ['model-1'],
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE ai_models SET'),
          expect.arrayContaining(['GPT-4 Turbo', 'Updated description', 'model-1']),
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO model_catalog'),
          expect.arrayContaining([
            'provider-1',
            'gpt-4',
            'Turbo Client',
            'Updated description',
            3,
            2,
            2,
            false,
          ]),
        );
      });

      it('does not publish inactive models even when catalog visibility is requested', async () => {
        const existingModel = {
          ...mockModel,
          status: 'active',
          enabled: true,
        };
        const updatedModel = {
          ...existingModel,
          status: 'inactive',
          enabled: true,
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [existingModel] })
          .mockResolvedValueOnce({ rows: [updatedModel] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const result = await service.updateModel('model-1', {
          status: 'inactive',
          isCatalogVisible: true,
        });

        expect(result).toEqual(updatedModel);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO model_catalog'),
          expect.arrayContaining([
            'provider-1',
            'gpt-4',
            'GPT-4',
            'GPT-4 model',
            1,
            1,
            0,
            false,
          ]),
        );
      });

      it('preserves existing catalog billing fields when updating model without catalog billing fields', async () => {
        const existingModel = {
          ...mockModel,
          status: 'active',
          enabled: true,
        };
        const updatedModel = {
          ...existingModel,
          name: 'GPT-4 Turbo',
        };
        const existingCatalog = {
          rank: 7,
          cost_multiplier: 2.5,
          required_plan_level: 3,
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [existingModel] })
          .mockResolvedValueOnce({ rows: [updatedModel] })
          .mockResolvedValueOnce({ rows: [existingCatalog] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const result = await service.updateModel('model-1', {
          name: 'GPT-4 Turbo',
        });

        expect(result).toEqual(updatedModel);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT rank, cost_multiplier, required_plan_level FROM model_catalog'),
          ['gpt-4'],
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO model_catalog'),
          expect.arrayContaining([
            'provider-1',
            'gpt-4',
            'GPT-4 Turbo',
            'GPT-4 model',
            7,
            2.5,
            3,
            true,
          ]),
        );
      });
    });

    describe('deleteModel', () => {
      it('soft-deletes model and deactivates the catalog projection', async () => {
        const existingModel = {
          ...mockModel,
          status: 'active',
          enabled: true,
        };
        const deactivatedModel = {
          ...existingModel,
          status: 'inactive',
          enabled: false,
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [existingModel] })
          .mockResolvedValueOnce({ rows: [deactivatedModel] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const result = await service.deleteModel('model-1');

        expect(result).toEqual(deactivatedModel);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE ai_models SET status = 'inactive'"),
          ['model-1'],
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE model_catalog SET is_active = false'),
          ['gpt-4'],
        );
      });

      it('deactivates the catalog projection when deleting an admin model', async () => {
        const existingModel = {
          ...mockModel,
          status: 'active',
        };
        const deactivatedModel = {
          ...existingModel,
          status: 'inactive',
        };
        const transactionQuery = jest
          .fn()
          .mockResolvedValueOnce({ rows: [existingModel] })
          .mockResolvedValueOnce({ rows: [deactivatedModel] })
          .mockResolvedValueOnce({ rows: [] });

        db.transaction.mockImplementation(async (callback) =>
          callback({ query: transactionQuery } as never),
        );

        const result = await service.deleteModel('model-1');

        expect(result).toEqual(deactivatedModel);
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE ai_models SET status = 'inactive'"),
          ['model-1'],
        );
        expect(transactionQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE model_catalog SET is_active = false'),
          ['gpt-4'],
        );
      });
    });
  });

  describe('ApiKey operations', () => {
    describe('createApiKey', () => {
      it('creates api key with encrypted value and returns safe fields only', async () => {
        db.queryOne.mockResolvedValue(mockSafeApiKey);

        const result = await service.createApiKey({
          providerId: 'provider-1',
          keyName: 'Test Key',
          apiKey: 'sk-test123',
        }, 'user-1');

        expect(result).toEqual(mockSafeApiKey);
        expectSafeApiKey(result);
        expect(encryption.hashForLookup).toHaveBeenCalledWith('sk-test123');
        expect(encryption.encrypt).toHaveBeenCalledWith('sk-test123');
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.not.stringContaining('RETURNING *'),
          expect.any(Array),
        );
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
      it('updates key status and returns safe fields only', async () => {
        const updated = { ...mockSafeApiKey, is_active: false };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateApiKeyStatus('key-1', { isActive: false });

        expect(result?.is_active).toBe(false);
        expectSafeApiKey(result);
        expect(db.query).toHaveBeenCalledWith(
          expect.not.stringContaining('RETURNING *'),
          [false, 'key-1'],
        );
      });
    });

    describe('updateApiKey', () => {
      it('updates key name only and returns safe fields only', async () => {
        const updated = { ...mockSafeApiKey, key_name: 'Updated Name' };
        db.query.mockResolvedValue(null);
        db.queryOne.mockResolvedValue(updated);

        const result = await service.updateApiKey('key-1', { keyName: 'Updated Name' });

        expect(result?.key_name).toBe('Updated Name');
        expectSafeApiKey(result);
      });

      it('updates api key value with re-encryption and returns safe fields only', async () => {
        db.query.mockResolvedValue(null);
        db.queryOne.mockResolvedValue(mockSafeApiKey);

        const result = await service.updateApiKey('key-1', { apiKey: 'sk-new123' });

        expect(encryption.hashForLookup).toHaveBeenCalledWith('sk-new123');
        expect(encryption.encrypt).toHaveBeenCalledWith('sk-new123');
        expectSafeApiKey(result);
      });

      it('updates endpoint url when no default exists', async () => {
        db.query.mockResolvedValue(null);
        db.queryOne
          .mockResolvedValueOnce(mockApiKey)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockSafeApiKey);
        db.query.mockResolvedValue(null);

        const result = await service.updateApiKey('key-1', { endpointUrl: 'https://new.endpoint.com' });

        expectSafeApiKey(result);
      });

      it('updates existing default endpoint when found', async () => {
        const endpoint = { id: 'ep-existing', provider_id: 'provider-1' };
        db.query.mockResolvedValue(null);
        db.queryOne
          .mockResolvedValueOnce(mockApiKey)
          .mockResolvedValueOnce(endpoint)
          .mockResolvedValueOnce(mockSafeApiKey);

        const result = await service.updateApiKey('key-1', { endpointUrl: 'https://updated.endpoint.com' });

        expectSafeApiKey(result);
      });

      it('does not select encrypted fields for the final updated key response', async () => {
        const updated = { ...mockSafeApiKey, key_name: 'New Name' };
        db.query.mockResolvedValue(null);
        db.queryOne.mockResolvedValue(updated);

        const result = await service.updateApiKey('key-1', {
          keyName: 'New Name',
          apiKey: 'sk-new',
          endpointUrl: 'https://new.url.com',
        });

        expect(result?.key_name).toBe('New Name');
        expectSafeApiKey(result);
        expect(db.queryOne).toHaveBeenLastCalledWith(
          expect.not.stringContaining('SELECT *'),
          ['key-1'],
        );
      });
    });

    describe('deleteApiKey', () => {
      it('deletes api key and returns safe fields only', async () => {
        db.queryOne.mockResolvedValue(mockSafeApiKey);

        const result = await service.deleteApiKey('key-1');

        expect(result).toEqual(mockSafeApiKey);
        expectSafeApiKey(result);
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.not.stringContaining('RETURNING *'),
          ['key-1'],
        );
      });
    });

    describe('findAllApiKeys', () => {
      it('returns all api keys without encrypted values', async () => {
        const keys = [{ id: 'key-1', key_name: 'Key 1' }, { id: 'key-2', key_name: 'Key 2' }];
        db.query.mockResolvedValue(keys);

        const result = await service.findAllApiKeys();

        expect(result).toHaveLength(2);
        expect(result[0]).not.toHaveProperty('encrypted_key');
      });
    });

    describe('findApiKeysByProvider', () => {
      it('returns api keys for specific provider', async () => {
        const keys = [{ id: 'key-1', provider_id: 'provider-1' }];
        db.query.mockResolvedValue(keys);

        const result = await service.findApiKeysByProvider('provider-1');

        expect(result).toHaveLength(1);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE provider_id'),
          ['provider-1'],
        );
      });
    });

    describe('updateApiKeyLastUsed', () => {
      it('updates last_used_at timestamp without returning key material', async () => {
        db.query.mockResolvedValue([]);

        await expect(service.updateApiKeyLastUsed('key-1')).resolves.toBeUndefined();

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('last_used_at'),
          ['key-1'],
        );
        expect(db.queryOne).not.toHaveBeenCalled();
      });
    });
  });

  describe('fetchModelsFromProvider', () => {
    it('fetches and syncs models from provider API', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(mockApiKey) // findActiveApiKeyByProvider
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey - SELECT query
        .mockResolvedValueOnce(null); // findDefaultEndpointByProvider
      db.query
        .mockResolvedValueOnce([]) // findModelsByProvider - empty initially
        .mockResolvedValueOnce([mockModel]); // INSERT result
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue({
        data: [{ id: 'gpt-4', name: 'GPT-4' }],
      });

      const result = await service.fetchModelsFromProvider('provider-1');

      expect(apiClient.fetchModels).toHaveBeenCalledWith(
        'https://api.openai.com',
        'decrypted-key',
        15000,
      );
      expect(result).toHaveLength(1);
    });

    it('uses custom endpoint when configured', async () => {
      const endpoint = { id: 'ep-1', base_url: 'https://custom.api.com' };
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(mockApiKey) // findActiveApiKeyByProvider
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(endpoint); // findDefaultEndpointByProvider
      db.query.mockResolvedValue([]);
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue({ data: [] });

      await service.fetchModelsFromProvider('provider-1');

      expect(apiClient.fetchModels).toHaveBeenCalledWith(
        'https://custom.api.com',
        'decrypted-key',
        15000,
      );
    });

    it('throws NotFoundException when provider not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.fetchModelsFromProvider('nonexistent'))
        .rejects.toThrow(HttpException);
    });

    it('throws BadRequestException when no active API key', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(null); // findActiveApiKeyByProvider

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });

    it('throws BadRequestException when no endpoint and no default URL', async () => {
      const unknownProvider = { ...mockProvider, code: 'unknown' };
      db.queryOne
        .mockResolvedValueOnce(unknownProvider) // findProviderById
        .mockResolvedValueOnce(mockApiKey) // findActiveApiKeyByProvider
        .mockResolvedValueOnce(null); // findDefaultEndpointByProvider

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });

    it('throws BadRequestException when API key decryption fails', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider) // findProviderById
        .mockResolvedValueOnce(mockApiKey) // findActiveApiKeyByProvider
        .mockResolvedValueOnce(null); // findDefaultEndpointByProvider
      encryption.decrypt.mockReturnValue(null); // decryption returns null

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });

    it('handles API error gracefully', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider)
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(null);
      encryption.decrypt.mockReturnValue('decrypted-key');
      const error = { message: 'Invalid API key' };
      apiClient.fetchModels.mockRejectedValue(error);

      await expect(service.fetchModelsFromProvider('provider-1'))
        .rejects.toThrow(HttpException);
    });

    it('handles API response with data array format', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider)
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(null);
      db.query.mockResolvedValue([]);
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue({
        data: [{ id: 'gpt-4', name: 'GPT-4' }],
      });

      const result = await service.fetchModelsFromProvider('provider-1');

      expect(result).toBeDefined();
    });

    it('handles API response with models array format', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider)
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(null);
      db.query.mockResolvedValue([]);
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue({
        models: [{ id: 'claude-3', name: 'Claude 3' }],
      });

      const result = await service.fetchModelsFromProvider('provider-1');

      expect(result).toBeDefined();
    });

    it('handles API response with flat array format', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockProvider)
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(null);
      db.query.mockResolvedValue([]);
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue([{ id: 'flat-model' }]);

      const result = await service.fetchModelsFromProvider('provider-1');

      expect(result).toBeDefined();
    });

    it('updates existing models instead of creating duplicates', async () => {
      const existingModel = { ...mockModel, model_id: 'gpt-4' };
      db.queryOne
        .mockResolvedValueOnce(mockProvider)
        .mockResolvedValueOnce(mockApiKey)
        .mockResolvedValueOnce(mockApiKey) // getDecryptedApiKey
        .mockResolvedValueOnce(null);
      db.query
        .mockResolvedValueOnce([existingModel]) // findModelsByProvider - has existing
        .mockResolvedValueOnce([{ ...existingModel, name: 'Updated' }]); // UPDATE result
      encryption.decrypt.mockReturnValue('decrypted-key');
      apiClient.fetchModels.mockResolvedValue({
        data: [{ id: 'gpt-4', name: 'Updated' }],
      });

      const result = await service.fetchModelsFromProvider('provider-1');

      expect(result).toHaveLength(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ai_models SET name'),
        expect.any(Array),
      );
    });
  });

  describe('Endpoint CRUD', () => {
    describe('createEndpoint', () => {
      it('creates endpoint', async () => {
        const endpoint = { id: 'ep-1', provider_id: 'provider-1', name: 'Test', base_url: 'https://api.test.com' };
        db.queryOne.mockResolvedValue(endpoint);

        const result = await service.createEndpoint({
          providerId: 'provider-1',
          name: 'Test',
          baseUrl: 'https://api.test.com',
        });

        expect(result).toEqual(endpoint);
      });
    });

    describe('findDefaultEndpointByProvider', () => {
      it('returns default active endpoint', async () => {
        const endpoint = { id: 'ep-1', base_url: 'https://api.test.com' };
        db.queryOne.mockResolvedValue(endpoint);

        const result = await service.findDefaultEndpointByProvider('provider-1');

        expect(result).toEqual(endpoint);
      });

      it('returns null when no default endpoint', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findDefaultEndpointByProvider('provider-1');

        expect(result).toBeNull();
      });
    });

    describe('findEndpointsByProvider', () => {
      it('returns all endpoints for provider ordered by is_default', async () => {
        const endpoints = [{ id: 'ep-1' }, { id: 'ep-2' }];
        db.query.mockResolvedValue(endpoints);

        const result = await service.findEndpointsByProvider('provider-1');

        expect(result).toHaveLength(2);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY is_default DESC'),
          ['provider-1'],
        );
      });
    });

    describe('findEndpointById', () => {
      it('returns endpoint by id', async () => {
        const endpoint = { id: 'ep-1', base_url: 'https://api.test.com' };
        db.queryOne.mockResolvedValue(endpoint);

        const result = await service.findEndpointById('ep-1');

        expect(result).toEqual(endpoint);
      });

      it('returns null when not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findEndpointById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('updateEndpoint', () => {
      it('updates endpoint name', async () => {
        const updated = { id: 'ep-1', name: 'Updated Endpoint' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateEndpoint('ep-1', { name: 'Updated Endpoint' });

        expect(result?.name).toBe('Updated Endpoint');
      });

      it('returns existing endpoint when no updates', async () => {
        const endpoint = { id: 'ep-1', name: 'Test' };
        db.queryOne.mockResolvedValue(endpoint);

        const result = await service.updateEndpoint('ep-1', {});

        expect(result).toEqual(endpoint);
      });

      it('updates multiple endpoint fields', async () => {
        const updated = { id: 'ep-1', name: 'Updated', base_url: 'https://new.url.com' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateEndpoint('ep-1', {
          name: 'Updated',
          baseUrl: 'https://new.url.com',
          timeoutMs: 30000,
        });

        expect(result?.name).toBe('Updated');
        expect(result?.base_url).toBe('https://new.url.com');
      });
    });

    describe('deleteEndpoint', () => {
      it('deletes endpoint', async () => {
        const endpoint = { id: 'ep-1' };
        db.queryOne.mockResolvedValue(endpoint);

        const result = await service.deleteEndpoint('ep-1');

        expect(result).toEqual(endpoint);
      });
    });
  });

  describe('ModelConfig CRUD', () => {
    describe('createModelConfig', () => {
      it('creates model config with defaults', async () => {
        const config = { id: 'cfg-1', model_id: 'model-1', config_name: 'Default' };
        db.queryOne.mockResolvedValue(config);

        const result = await service.createModelConfig({
          modelId: 'model-1',
          configName: 'Default',
        });

        expect(result).toEqual(config);
      });
    });

    describe('findModelConfigsByModel', () => {
      it('returns configs for model', async () => {
        const configs = [{ id: 'cfg-1' }];
        db.query.mockResolvedValue(configs);

        const result = await service.findModelConfigsByModel('model-1');

        expect(result).toEqual(configs);
      });
    });

    describe('findModelConfigById', () => {
      it('returns config by id', async () => {
        const config = { id: 'cfg-1', model_id: 'model-1' };
        db.queryOne.mockResolvedValue(config);

        const result = await service.findModelConfigById('cfg-1');

        expect(result).toEqual(config);
      });

      it('returns null when not found', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findModelConfigById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('updateModelConfig', () => {
      it('updates config temperature', async () => {
        const updated = { id: 'cfg-1', temperature: 0.9 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModelConfig('cfg-1', { temperature: 0.9 });

        expect(result?.temperature).toBe(0.9);
      });

      it('returns existing config when no updates', async () => {
        const config = { id: 'cfg-1', temperature: 0.7 };
        db.queryOne.mockResolvedValue(config);

        const result = await service.updateModelConfig('cfg-1', {});

        expect(result).toEqual(config);
      });

      it('updates multiple config fields', async () => {
        const updated = { id: 'cfg-1', temperature: 0.8, max_tokens: 4096 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateModelConfig('cfg-1', {
          temperature: 0.8,
          maxTokens: 4096,
          topP: 0.9,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe('DefaultModel CRUD', () => {
    describe('createDefaultModel', () => {
      it('creates default model', async () => {
        const defaultModel = { id: 'dm-1', provider_id: 'provider-1', use_case: 'chat' };
        db.queryOne.mockResolvedValue(defaultModel);

        const result = await service.createDefaultModel({
          providerId: 'provider-1',
          modelId: 'model-1',
          useCase: 'general',
        });

        expect(result).toEqual(defaultModel);
      });
    });

    describe('findDefaultModelByUseCase', () => {
      it('returns default model for use case', async () => {
        const defaultModel = { id: 'dm-1', use_case: 'chat' };
        db.queryOne.mockResolvedValue(defaultModel);

        const result = await service.findDefaultModelByUseCase('chat');

        expect(result).toEqual(defaultModel);
      });

      it('returns null when no default model for use case', async () => {
        db.queryOne.mockResolvedValue(null);

        const result = await service.findDefaultModelByUseCase('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findDefaultModelsByProvider', () => {
      it('returns all default models for provider', async () => {
        const defaults = [{ id: 'dm-1', provider_id: 'provider-1' }];
        db.query.mockResolvedValue(defaults);

        const result = await service.findDefaultModelsByProvider('provider-1');

        expect(result).toHaveLength(1);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE dm.provider_id'),
          ['provider-1'],
        );
      });
    });

    describe('findAllDefaultModels', () => {
      it('returns all default models with provider info', async () => {
        const defaults = [{ id: 'dm-1', model_name: 'GPT-4' }];
        db.query.mockResolvedValue(defaults);

        const result = await service.findAllDefaultModels();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('model_name');
      });
    });

    describe('updateDefaultModel', () => {
      it('updates default model model_id', async () => {
        const updated = { id: 'dm-1', model_id: 'new-model' };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateDefaultModel('dm-1', { modelId: 'new-model-1' });

        expect(result?.model_id).toBe('new-model');
      });

      it('returns existing default model when no updates', async () => {
        const defaultModel = { id: 'dm-1', model_id: 'model-1' };
        db.queryOne.mockResolvedValue(defaultModel);

        const result = await service.updateDefaultModel('dm-1', {});

        expect(result).toEqual(defaultModel);
      });
    });

    describe('deleteDefaultModel', () => {
      it('deletes default model', async () => {
        const defaultModel = { id: 'dm-1' };
        db.queryOne.mockResolvedValue(defaultModel);

        const result = await service.deleteDefaultModel('dm-1');

        expect(result).toEqual(defaultModel);
      });
    });
  });

  describe('TeamQuota CRUD', () => {
    describe('createTeamQuota', () => {
      it('creates team quota with defaults', async () => {
        const quota = { id: 'quota-1', team_id: 'team-1', daily_token_limit: 1000000 };
        db.queryOne.mockResolvedValue(quota);

        const result = await service.createTeamQuota({ teamId: 'team-1' });

        expect(result).toEqual(quota);
      });
    });

    describe('findTeamQuotaByTeamId', () => {
      it('returns quota for team', async () => {
        const quota = { id: 'quota-1', team_id: 'team-1' };
        db.queryOne.mockResolvedValue(quota);

        const result = await service.findTeamQuotaByTeamId('team-1');

        expect(result).toEqual(quota);
      });
    });

    describe('incrementTeamQuotaUsage', () => {
      it('increments usage counters', async () => {
        const quota = { id: 'quota-1', used_today: 100 };
        db.queryOne.mockResolvedValue(quota);

        const result = await service.incrementTeamQuotaUsage('team-1', 50, true);

        expect(result).toBeDefined();
        expect(db.queryOne).toHaveBeenCalledWith(
          expect.stringContaining('used_today = used_today'),
          expect.any(Array),
        );
      });
    });

    describe('resetTeamQuotaDaily', () => {
      it('resets daily counters', async () => {
        db.queryOne.mockResolvedValue({ id: 'quota-1' });

        const result = await service.resetTeamQuotaDaily('team-1');

        expect(result).toBeDefined();
      });
    });

    describe('updateTeamQuota', () => {
      it('updates daily token limit', async () => {
        const updated = { id: 'quota-1', daily_token_limit: 2000000 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateTeamQuota('team-1', { dailyTokenLimit: 2000000 });

        expect(result?.daily_token_limit).toBe(2000000);
      });

      it('returns existing quota when no updates', async () => {
        const quota = { id: 'quota-1', daily_token_limit: 1000000 };
        db.queryOne.mockResolvedValue(quota);

        const result = await service.updateTeamQuota('team-1', {});

        expect(result).toEqual(quota);
      });

      it('updates multiple quota fields', async () => {
        const updated = { id: 'quota-1', daily_token_limit: 2000000, monthly_token_limit: 20000000 };
        db.query.mockResolvedValue([updated]);

        const result = await service.updateTeamQuota('team-1', {
          dailyTokenLimit: 2000000,
          monthlyTokenLimit: 20000000,
          dailyRequestLimit: 2000,
        });

        expect(result).toBeDefined();
      });
    });
  });

  describe('UsageLog', () => {
    describe('createUsageLog', () => {
      it('creates usage log entry', async () => {
        const log = { id: 'log-1', model_id: 'model-1', input_tokens: 100 };
        db.queryOne.mockResolvedValue(log);

        const result = await service.createUsageLog({
          teamId: 'team-1',
          modelId: 'model-1',
          providerId: 'provider-1',
          inputTokens: 100,
          outputTokens: 200,
        });

        expect(result).toEqual(log);
      });
    });

    describe('findUsageLogsByTeam', () => {
      it('returns usage logs with pagination', async () => {
        const logs = [{ id: 'log-1' }];
        db.query.mockResolvedValue(logs);

        const result = await service.findUsageLogsByTeam('team-1', 50, 0);

        expect(result).toEqual(logs);
      });
    });

    describe('getUsageStatsByTeam', () => {
      it('returns aggregated stats for day period', async () => {
        db.queryOne.mockResolvedValue({ total_cost: '10.5', total_tokens: '1000', total_requests: '50' });
        db.query.mockResolvedValue([
          { model_name: 'GPT-4', provider_name: 'OpenAI', cost: '10.5', tokens: '1000', requests: '50' },
        ]);

        const result = await service.getUsageStatsByTeam('team-1', 'day');

        expect(result.totalCost).toBe(10.5);
        expect(result.totalTokens).toBe(1000);
        expect(result.totalRequests).toBe(50);
        expect(result.breakdown).toHaveLength(1);
      });

      it('returns aggregated stats for week period', async () => {
        db.queryOne.mockResolvedValue({ total_cost: '0', total_tokens: '0', total_requests: '0' });
        db.query.mockResolvedValue([]);

        const result = await service.getUsageStatsByTeam('team-1', 'week');

        expect(result.totalCost).toBe(0);
      });

      it('returns aggregated stats for month period', async () => {
        db.queryOne.mockResolvedValue({ total_cost: '100', total_tokens: '10000', total_requests: '500' });
        db.query.mockResolvedValue([]);

        const result = await service.getUsageStatsByTeam('team-1', 'month');

        expect(result.totalCost).toBe(100);
      });
    });
  });

  describe('generateUUID', () => {
    it('generates valid UUID format', () => {
      const uuid = (service as any).generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('generates unique UUIDs', () => {
      const uuid1 = (service as any).generateUUID();
      const uuid2 = (service as any).generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
