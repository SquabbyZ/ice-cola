import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CONFIG_KEYS } from '../admin-admin/config.service';
import { Resend } from 'resend';

const TEAM_NAME = '加冰可乐团队';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private db: DatabaseService) {}

  /**
   * Initialize Resend client (lazy initialization)
   */
  private async getResendClient(): Promise<Resend | null> {
    if (this.resend) {
      return this.resend;
    }

    const config = await this.db.queryOne<{ value: string }>(
      'SELECT value FROM system_config WHERE key = $1',
      [CONFIG_KEYS.RESEND_API_KEY]
    );

    if (!config?.value) {
      this.logger.warn('RESEND_API_KEY not configured');
      return null;
    }

    this.resend = new Resend(config.value);
    return this.resend;
  }

  /**
   * Get the configured from email address
   */
  private async getFromEmail(): Promise<string> {
    const config = await this.db.queryOne<{ value: string }>(
      'SELECT value FROM system_config WHERE key = $1',
      [CONFIG_KEYS.RESEND_FROM_EMAIL]
    );

    return config?.value || 'noreply@example.com';
  }

  /**
   * Send registration verification code email
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const resend = await this.getResendClient();
    if (!resend) {
      this.logger.warn('Email service not available, skipping email send');
      return;
    }

    const fromEmail = await this.getFromEmail();

    const text = `
您好，

您的注册验证码是：${code}
有效期 5 分钟，请勿泄露。

— ${TEAM_NAME}
`.trim();

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: '注册验证码',
        text,
      });
      this.logger.log(`Verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send team invitation email
   */
  async sendTeamInviteEmail(
    email: string,
    inviterName: string,
    teamName: string,
    inviteLink: string,
  ): Promise<void> {
    const resend = await this.getResendClient();
    if (!resend) {
      this.logger.warn('Email service not available, skipping email send');
      return;
    }

    const fromEmail = await this.getFromEmail();

    const text = `
您好，

您被邀请加入团队 ${teamName}。

邀请人：${inviterName}

点击以下链接接受邀请：
${inviteLink}

链接 3 天内有效。

— ${TEAM_NAME}
`.trim();

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `邀请您加入团队 ${teamName}`,
        text,
      });
      this.logger.log(`Team invite sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send team invite to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send admin panel invitation email
   */
  async sendAdminInviteEmail(
    email: string,
    inviterName: string,
    role: string,
    inviteLink: string,
  ): Promise<void> {
    const resend = await this.getResendClient();
    if (!resend) {
      this.logger.warn('Email service not available, skipping email send');
      return;
    }

    const fromEmail = await this.getFromEmail();

    const text = `
您好，

您被邀请成为管理后台用户。

邀请人：${inviterName}
角色：${role}

点击以下链接完成注册：
${inviteLink}

链接 3 天内有效。

— ${TEAM_NAME}
`.trim();

    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: '管理后台邀请',
        text,
      });
      this.logger.log(`Admin invite sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send admin invite to ${email}:`, error);
      throw error;
    }
  }
}