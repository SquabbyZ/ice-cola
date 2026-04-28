import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { CaptchaService } from '../commons/captcha.service';
import { SendCodeDto, VerifyCodeDto, ClientRegisterDto } from './client-dto/client-auth.dto';

@Controller('client/auth')
export class ClientAuthController {
  constructor(
    private readonly clientAuthService: ClientAuthService,
    private readonly captchaService: CaptchaService,
  ) {}

  /**
   * Generate a captcha image
   * POST /client/auth/captcha
   */
  @Post('captcha')
  async generateCaptcha() {
    const result = await this.captchaService.generateCaptcha();
    return {
      success: true,
      data: {
        token: result.token,
        imageUrl: result.imageUrl,
        expiresAt: result.expiresAt,
      },
    };
  }

  /**
   * Send verification code to email (requires captcha verification)
   * POST /client/auth/send-code
   */
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() dto: SendCodeDto) {
    await this.clientAuthService.sendVerificationCode(dto.email, dto.captchaToken, dto.captchaAnswer);
    return {
      success: true,
      message: '验证码已发送',
    };
  }

  /**
   * Verify email code
   * POST /client/auth/verify-code
   */
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const isValid = await this.clientAuthService.verifyCode(dto.email, dto.code);
    if (!isValid) {
      return {
        success: false,
        message: '验证码错误或已过期',
      };
    }
    return {
      success: true,
      message: '验证成功',
    };
  }

  /**
   * Complete registration with email verification
   * POST /client/auth/register
   */
  @Post('register')
  async register(@Body() dto: ClientRegisterDto) {
    const result = await this.clientAuthService.registerWithVerification(dto);
    return {
      success: true,
      data: result,
    };
  }
}