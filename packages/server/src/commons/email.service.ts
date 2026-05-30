import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { EmailTemplateService } from './email-template.service';
import { Resend } from 'resend';

const TEAM_NAME = '加冰可乐团队';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private configService: ConfigService,
    private emailTemplateService: EmailTemplateService,
    private moduleRef: ModuleRef,
  ) {}

  /**
   * Lazily resolve raw config from admin DB, bypassing value masking.
   * Uses DatabaseService directly to get unmasked sensitive values.
   */
  private async getAdminConfig(key: string): Promise<string | null> {
    try {
      const { CONFIG_KEYS } = await import('../admin-admin/config.service');
      const { DatabaseService } = await import('../database/database.service');
      const db = this.moduleRef.get(DatabaseService, { strict: false });
      const configKey = CONFIG_KEYS[key as keyof typeof CONFIG_KEYS];
      if (!configKey) return null;
      const row = await db.queryOne<{ value: string }>(
        'SELECT value FROM system_config WHERE key = $1',
        [configKey],
      );
      const raw = row?.value ?? null;
      if (raw && typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return raw; }
      }
      return raw;
    } catch {
      return null;
    }
  }

  /**
   * Get Resend API key: env var first, then admin DB config
   */
  private async getResendApiKey(): Promise<string | null> {
    const envKey = this.configService.get<string>('RESEND_API_KEY');
    if (envKey) return envKey;
    return this.getAdminConfig('RESEND_API_KEY');
  }

  /**
   * Get Resend from email: env var first, then admin DB config
   */
  private async getResendFromEmail(): Promise<string> {
    const envFrom = this.configService.get<string>('RESEND_FROM_EMAIL');
    if (envFrom) return envFrom;
    const dbFrom = await this.getAdminConfig('RESEND_FROM_EMAIL');
    return dbFrom || 'onboarding@resend.dev';
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
    const html = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>验证码</h2>
  <p>您的注册验证码是：</p>
  <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #3b82f6; margin: 24px 0; text-align: center;">${code}</div>
  <p style="color: #666;">有效期 5 分钟，请勿泄露。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #999; font-size: 12px;">— ${TEAM_NAME}</p>
</div>
`.trim();

    await this.sendEmail(email, '您的注册验证码', html);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const apiKey = await this.getResendApiKey();
    if (!apiKey) {
      this.logger.warn('Resend API key not configured (env or admin), logging email instead');
      this.logger.log(`[DEV] Email to ${to}:\nSubject: ${subject}\n${html}`);
      return;
    }

    const fromEmail = await this.getResendFromEmail();
    const resend = new Resend(apiKey);

    try {
      const res = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });

      this.logger.log(`Resend email response to ${to}: ${JSON.stringify(res)}`);

      if (res.error) {
        this.logger.error(`Resend API error for ${to}:`, res.error);
        throw new Error(res.error.message || 'Resend API returned an error');
      }

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
    const rendered = await this.emailTemplateService.renderByKey('team_invite', {
      inviterName,
      teamName,
      inviteLink,
    });

    if (rendered) {
      await this.sendEmail(email, rendered.subject, rendered.body);
      return;
    }

    const html = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>团队邀请</h2>
  <p>${inviterName} 邀请您加入团队 "${teamName}"。</p>
  <p>点击以下链接接受邀请：</p>
  <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">接受邀请</a></p>
  <p style="color: #666; font-size: 14px;">链接 7 天内有效。</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="color: #999; font-size: 12px;">— ${TEAM_NAME}</p>
</div>
`.trim();

    await this.sendEmail(email, `您收到来自 ${teamName} 的团队邀请`, html);
  }
}