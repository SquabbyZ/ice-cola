import { Controller, Post, Body, UseGuards, Get, Delete, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  ResetPasswordDto,
} from './dto/login.dto';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  RevokeInvitationDto,
} from './dto/invite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin/auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.adminService.login(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.adminService.register(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    await this.adminService.sendResetCode(dto.email);
    return {
      success: true,
      data: null,
      message: '验证码已发送',
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.adminService.resetPassword(dto.email, dto.code, dto.newPassword);
    return {
      success: true,
      data: null,
      message: '密码已重置',
    };
  }

  @Post('invitations')
  @UseGuards(AuthGuard('jwt'))
  async createInvitation(@Body() dto: CreateInvitationDto) {
    // Note: In a real app, you'd get the current user from JWT
    const result = await this.adminService.createInvitation(
      dto.email,
      dto.role,
      'system' // TODO: Get from JWT
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('invitations')
  @UseGuards(AuthGuard('jwt'))
  async getInvitations() {
    const result = await this.adminService.getInvitations();
    return {
      success: true,
      data: result,
    };
  }

  @Get('invitations/:token/validate')
  async validateInvitationToken(@Param('token') token: string) {
    const invitation = await this.adminService.getInvitationByToken(token);
    if (!invitation) {
      return {
        success: true,
        data: {
          valid: false,
          message: '邀请无效或已过期',
        },
      };
    }
    return {
      success: true,
      data: {
        valid: true,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  @Get('invitations/:token')
  @UseGuards(AuthGuard('jwt'))
  async getInvitationByToken(@Param('token') token: string) {
    const result = await this.adminService.getInvitationByToken(token);
    return {
      success: true,
      data: result,
    };
  }

  @Delete('invitations/:id')
  @UseGuards(AuthGuard('jwt'))
  async revokeInvitation(@Param('id') id: string) {
    await this.adminService.revokeInvitation(id);
    return {
      success: true,
      data: null,
      message: '邀请已撤销',
    };
  }

  @Post('invitations/accept')
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    const result = await this.adminService.acceptInvitation(dto);
    // Generate JWT token for the new user
    const token = this.adminService.generateToken(result);
    return {
      success: true,
      data: {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
        },
        accessToken: token,
        expiresIn: 900,
      },
    };
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'))
  async getUsers() {
    const result = await this.adminService.getUsers();
    return {
      success: true,
      data: result,
    };
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard('jwt'))
  async removeUser(@Param('id') id: string) {
    await this.adminService.removeUser(id);
    return {
      success: true,
      data: null,
      message: '用户已删除',
    };
  }
}