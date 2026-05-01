import { Injectable, Logger } from '@nestjs/common';

const TEAM_NAME = '加冰可乐团队';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send registration verification code email
   * Note: This is a stub implementation. In production, integrate with an email provider like Resend.
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const text = `
您好，

您的注册验证码是：${code}
有效期 5 分钟，请勿泄露。

— ${TEAM_NAME}
`.trim();

    // In development, just log the email
    this.logger.log(`[DEV] Verification code email to ${email}:\n${text}`);

    // In production, you would integrate with Resend or another email provider:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'noreply@example.com',
    //   to: email,
    //   subject: '注册验证码',
    //   text,
    // });
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