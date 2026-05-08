import { Module, Global } from '@nestjs/common';
import { CaptchaService } from './captcha.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

@Global()
@Module({
  providers: [CaptchaService, EmailService, EmailTemplateService],
  exports: [CaptchaService, EmailService, EmailTemplateService],
})
export class CommonModule {}