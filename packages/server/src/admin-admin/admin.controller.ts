import { Controller, Post, Body, UseGuards, Get, Delete, Param, Put, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AdminService } from './admin.service';
import {
  LoginDto,
  RegisterDto,
  SendCodeDto,
  VerifyCodeDto,
  ResetPasswordDto,
} from './dto/login.dto';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  RevokeInvitationDto,
} from './dto/invite.dto';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';

const ACTOR_IP_MAX = 45;
const ACTOR_UA_MAX = 512;

function extractActor(req: ExpressRequest): { ip: string | null; userAgent: string | null } {
  const rawIp = (req.ip ?? (req.socket as { remoteAddress?: string } | undefined)?.remoteAddress ?? 'unknown').toString();
  const rawUa = (req.get('user-agent') ?? '').toString();
  return {
    ip: rawIp.slice(0, ACTOR_IP_MAX) || null,
    userAgent: rawUa.slice(0, ACTOR_UA_MAX) || null,
  };
}

@Controller('admin/auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get('has-owner')
  async hasOwner() {
    const exists = await this.adminService.hasOwner();
    return {
      success: true,
      data: { hasOwner: exists },
    };
  }

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
    await this.adminService.sendResetCode(dto.email, dto.captchaToken, dto.captchaAnswer);
    return {
      success: true,
      data: null,
      message: '验证码已发送',
    };
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    const isValid = await this.adminService.verifyCode(dto.email, dto.code, 'reset_password');
    return {
      success: isValid,
      data: null,
      message: isValid ? '验证码正确' : '验证码无效或已过期',
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
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createInvitation(@Body() dto: CreateInvitationDto, @Request() req: any) {
    const result = await this.adminService.createInvitation(
      dto.email,
      dto.role,
      req.user.sub
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('invitations')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
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
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async getInvitationByToken(@Param('token') token: string) {
    const result = await this.adminService.getInvitationByToken(token);
    return {
      success: true,
      data: result,
    };
  }

  @Delete('invitations/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
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
  async getUsers() {
    const result = await this.adminService.getUsers();
    return {
      success: true,
      data: result,
    };
  }

  @Delete('users/:id')
  @UseGuards(AdminJwtAuthGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async removeUser(@Param('id') id: string, @Request() req: any) {
    const actor = extractActor(req as ExpressRequest);
    await this.adminService.removeUser(id, actor.ip, actor.userAgent);
    return {
      success: true,
      data: null,
      message: '用户已删除',
    };
  }

  // ========== Dashboard Stats ==========

  @Get('stats')
  @UseGuards(AdminJwtAuthGuard)
  async getStats(@Request() req: any) {
    const stats = await this.adminService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  // ========== Update User Role ==========

  @Put('users/:id/role')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }, @Request() req: any) {
    const actor = extractActor(req as ExpressRequest);
    const result = await this.adminService.updateUserRole(id, body.role, actor.ip, actor.userAgent);
    return {
      success: true,
      data: result,
      message: '角色已更新',
    };
  }

  // ========== Transfer Ownership ==========

  @Put('users/:id/transfer-owner')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER)
  async transferOwner(@Param('id') id: string, @Request() req: any) {
    const actor = extractActor(req as ExpressRequest);
    const result = await this.adminService.transferOwner(id, actor.ip, actor.userAgent);
    return {
      success: true,
      data: result,
      message: '所有权已移交',
    };
  }

  // ========== Profile & Password ==========

  @Put('profile')
  @UseGuards(AdminJwtAuthGuard)
  async updateProfile(@Body() body: { name: string }, @Request() req: any) {
    const userId = req.user.sub;
    const result = await this.adminService.updateProfile(userId, body.name);
    return {
      success: true,
      data: result,
      message: '个人资料已更新',
    };
  }

  @Put('change-password')
  @UseGuards(AdminJwtAuthGuard)
  async changePassword(@Body() body: { currentPassword: string; newPassword: string }, @Request() req: any) {
    const userId = req.user.sub;
    const actor = extractActor(req as ExpressRequest);
    await this.adminService.changePassword(userId, body.currentPassword, body.newPassword, actor.ip, actor.userAgent);
    return {
      success: true,
      data: null,
      message: '密码已修改',
    };
  }
}