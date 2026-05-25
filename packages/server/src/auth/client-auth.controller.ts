import { Controller, Post, Body, HttpCode, HttpStatus, Req, Get, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { CaptchaService } from '../commons/captcha.service';
import { SendCodeDto, VerifyCodeDto, ClientRegisterDto, SendResetCodeDto, ResetPasswordDto } from './client-dto/client-auth.dto';

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
   * Generate a test captcha with known answer (E2E testing only)
   * GET /client/auth/captcha/test
   */
  @Get('captcha/test')
  async generateTestCaptcha() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const result = await this.captchaService.generateTestCaptcha();
    return {
      success: true,
      data: {
        token: result.token,
        imageUrl: result.imageUrl,
        answer: result.answer,
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
  async sendCode(@Body() dto: SendCodeDto, @Req() req: Request) {
    await this.clientAuthService.sendVerificationCode(
      dto.email,
      dto.captchaToken,
      dto.captchaAnswer,
      req.ip,
    );
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
  async verifyCode(@Body() dto: VerifyCodeDto, @Req() req: Request) {
    const isValid = await this.clientAuthService.verifyCode(dto.email, dto.code, req.ip, dto.type);
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
  async register(@Body() dto: ClientRegisterDto, @Req() req: Request) {
    const result = await this.clientAuthService.registerWithVerification(
      dto,
      req.ip,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Send reset password code to email (requires captcha verification)
   * POST /client/auth/send-reset-code
   */
  @Post('send-reset-code')
  @HttpCode(HttpStatus.OK)
  async sendResetCode(@Body() dto: SendResetCodeDto, @Req() req: Request) {
    await this.clientAuthService.sendResetPasswordCode(
      dto.email,
      dto.captchaToken,
      dto.captchaAnswer,
      req.ip,
    );
    return {
      success: true,
      message: '验证码已发送',
    };
  }

  /**
   * Reset password with email verification code
   * POST /client/auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.clientAuthService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
      req.ip,
    );
    return {
      success: true,
      message: '密码重置成功',
    };
  }
}