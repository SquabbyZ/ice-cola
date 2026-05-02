import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';
import { Resend } from 'resend';

const TEAM_NAME = '加冰可乐团队';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(
    private configService: ConfigService,
    private emailTemplateService: EmailTemplateService,
  ) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const rendered = await this.emailTemplateService.renderByKey('verification_code', { code });

    if (!rendered) {
      this.logger.warn('Verification code template not found, using fallback');
      await this.sendFallbackEmail(email, code);
      return;
    }

    await this.sendEmail(email, rendered.subject, rendered.body);
  }

  private async sendFallbackEmail(email: string, code: string): Promise<void> {
    const text = `
您好，

您的注册验证码是：${code}
有效期 5 分钟，请勿泄露。

— ${TEAM_NAME}
`.trim();

    this.logger.log(`[DEV] Verification code email to ${email}:\n${text}`);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend client not configured, logging email instead');
      this.logger.log(`[DEV] Email to ${to}:\nSubject: ${subject}\n${html}`);
      return;
    }

    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';

    try {
      const res = await this.resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });

      this.logger.log(`Resend email sent to ${to}, MessageId: ${res?.data?.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email via Resend to ${to}:`, error);
      throw error;
    }
  }

  async sendTeamInviteEmail(
    email: string,
    inviterName: string,
    teamName: string,
    inviteLink: string,
  ): Promise<void> {
    const text = `
您好，

${inviterName} 邀请您加入团队 "${teamName}"。

点击以下链接接受邀请：
${inviteLink}

链接 7 天内有效。

— ${TEAM_NAME}
`.trim();

    this.logger.log(`[DEV] Team invite email to ${email}:\n${text}`);
  }
}