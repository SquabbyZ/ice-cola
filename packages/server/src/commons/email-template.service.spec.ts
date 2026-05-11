import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';
import { DatabaseService } from '../database/database.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let db: jest.Mocked<DatabaseService>;

  const mockTemplate = {
    id: 'tmpl-1',
    key: 'verification_code',
    name: 'Verification Code',
    subject: 'Your verification code is {{code}}',
    body: 'Hello, your code is {{code}}. Valid for 5 minutes.',
    variables: '["code"]',
    is_active: true,
    createdat: '2024-01-01T00:00:00Z',
    updatedat: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
    db = module.get(DatabaseService);
  });

  describe('findByKey', () => {
    it('returns template when found', async () => {
      db.queryOne.mockResolvedValue(mockTemplate);

      const result = await service.findByKey('verification_code');

      expect(result).toBeTruthy();
      expect(result?.key).toBe('verification_code');
      expect(result?.subject).toBe('Your verification code is {{code}}');
    });

    it('returns null when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.findByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all templates', async () => {
      db.query.mockResolvedValue([mockTemplate]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('verification_code');
    });

    it('returns empty array when no templates', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates template subject', async () => {
      const updated = { ...mockTemplate, subject: 'New subject' };
      db.queryOne.mockResolvedValue(updated);

      const result = await service.update('verification_code', { subject: 'New subject' });

      expect(result?.subject).toBe('New subject');
    });

    it('updates template body', async () => {
      const updated = { ...mockTemplate, body: 'New body' };
      db.queryOne.mockResolvedValue(updated);

      const result = await service.update('verification_code', { body: 'New body' });

      expect(result?.body).toBe('New body');
    });

    it('returns existing template when no updates', async () => {
      db.queryOne.mockResolvedValue(null); // No result from UPDATE
      db.queryOne.mockResolvedValue(mockTemplate); // findByKey fallback

      const result = await service.update('verification_code', {});

      expect(result).toBeTruthy();
    });

    it('returns null when template not found', async () => {
      db.queryOne.mockResolvedValue(null); // No result from UPDATE

      const result = await service.update('nonexistent', { subject: 'New' });

      expect(result).toBeNull();
    });
  });

  describe('renderTemplate', () => {
    it('replaces variables with values', () => {
      const result = service.renderTemplate('Hello {{name}}, your code is {{code}}', {
        name: 'John',
        code: '123456',
      });

      expect(result).toBe('Hello John, your code is 123456');
    });

    it('leaves missing variables empty', () => {
      const result = service.renderTemplate('Hello {{name}}, code is {{code}}', {
        name: 'John',
      });

      expect(result).toBe('Hello John, code is ');
    });

    it('handles template with no variables', () => {
      const result = service.renderTemplate('Static text only', {});

      expect(result).toBe('Static text only');
    });
  });

  describe('renderByKey', () => {
    it('renders template with variables', async () => {
      db.queryOne.mockResolvedValue(mockTemplate);

      const result = await service.renderByKey('verification_code', { code: '654321' });

      expect(result).toBeTruthy();
      expect(result?.subject).toBe('Your verification code is 654321');
      expect(result?.body).toBe('Hello, your code is 654321. Valid for 5 minutes.');
    });

    it('returns null when template not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.renderByKey('nonexistent', {});

      expect(result).toBeNull();
    });

    it('returns null when template is inactive', async () => {
      db.queryOne.mockResolvedValue({ ...mockTemplate, is_active: false });

      const result = await service.renderByKey('verification_code', {});

      expect(result).toBeNull();
    });
  });
});