import { Controller, Get, Put, Param, Body, Logger } from '@nestjs/common';
import { EmailTemplateService, EmailTemplate } from '../commons/email-template.service';

@Controller('admin/config/email-templates')
export class EmailTemplateController {
  private logger = new Logger(EmailTemplateController.name);

  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get('list')
  async findAll(): Promise<{ success: boolean; data: EmailTemplate[] }> {
    this.logger.log('Finding all templates');
    const templates = await this.emailTemplateService.findAll();
    this.logger.log(`Found ${templates.length} templates`);
    return { success: true, data: templates };
  }

  @Get(':key')
  async findOne(@Param('key') key: string): Promise<{ success: boolean; data: EmailTemplate | null }> {
    this.logger.log(`Finding template with key: ${key}`);
    const template = await this.emailTemplateService.findByKey(key);
    this.logger.log(`Found template: ${JSON.stringify(template)}`);
    return { success: true, data: template };
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body() body: { subject?: string; body?: string }
  ): Promise<{ success: boolean; data: EmailTemplate | null }> {
    const template = await this.emailTemplateService.update(key, body);
    return { success: true, data: template };
  }

  @Get(':key/preview')
  async preview(
    @Param('key') key: string,
  ): Promise<{ success: boolean; data: { subject: string; body: string } | null }> {
    const rendered = await this.emailTemplateService.renderByKey(key, { code: '123456' });
    return { success: true, data: rendered };
  }
}