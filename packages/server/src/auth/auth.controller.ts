import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    const result = await this.authService.getCurrentUser(req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.id);
    return {
      success: true,
      data: null,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    const result = await this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword
    );
    return {
      success: true,
      data: result,
    };
  }
}
