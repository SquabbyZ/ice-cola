import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';

describe('EmailService', () => {
  let service: EmailService;
  let mockConfigService: any;
  let mockEmailTemplateService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };
    mockEmailTemplateService = {
      renderByKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailTemplateService,
          useValue: mockEmailTemplateService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('constructor', () => {
    it('initializes without resend when no API key', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EmailTemplateService, useValue: mockEmailTemplateService },
        ],
      }).compile();

      const newService = newModule.get<EmailService>(EmailService);
      expect(newService).toBeDefined();
    });

    it('initializes with resend when API key exists', async () => {
      mockConfigService.get.mockReturnValue('test-api-key');

      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: EmailTemplateService, useValue: mockEmailTemplateService },
        ],
      }).compile();

      const newService = newModule.get<EmailService>(EmailService);
      expect(newService).toBeDefined();
    });
  });

  describe('sendVerificationCode', () => {
    it('sends verification code with rendered template', async () => {
      const rendered = { subject: 'Verification Code', body: '<p>Your code is 123456</p>' };
      mockEmailTemplateService.renderByKey.mockResolvedValue(rendered);

      await service.sendVerificationCode('test@example.com', '123456');

      expect(mockEmailTemplateService.renderByKey).toHaveBeenCalledWith('verification_code', { code: '123456' });
    });

    it('uses fallback when template not found', async () => {
      mockEmailTemplateService.renderByKey.mockResolvedValue(null);

      await service.sendVerificationCode('test@example.com', '123456');

      expect(mockEmailTemplateService.renderByKey).toHaveBeenCalledWith('verification_code', { code: '123456' });
    });
  });

  describe('sendTeamInviteEmail', () => {
    it('logs team invite email', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.sendTeamInviteEmail(
        'invitee@example.com',
        'John Doe',
        'Test Team',
        'https://example.com/invite?token=abc123'
      );

      expect(loggerSpy).toHaveBeenCalled();
      const logCall = loggerSpy.mock.calls[0][0];
      expect(logCall).toContain('invitee@example.com');
      expect(logCall).toContain('John Doe');
      expect(logCall).toContain('Test Team');
    });
  });
});