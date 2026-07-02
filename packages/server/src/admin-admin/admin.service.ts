import { Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';
import { CaptchaService } from '../commons/captcha.service';
import { EmailService } from '../commons/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AdminRole,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto/invite.dto';
import { AdminAuditService } from './admin-audit.service';

export interface AdminUser {
  id: string;
  email: string;
  password?: string;
  name: string | null;
  role: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private captchaService: CaptchaService,
    private emailService: EmailService,
    @Optional() private audit: AdminAuditService,
  ) {}

  private async safeAudit(entry: Parameters<AdminAuditService['log']>[0]): Promise<void> {
    if (!this.audit) return;
    try { await this.audit.log(entry); } catch (e) { console.warn('[admin-audit] failed:', (e as Error).message ?? e); }
  }

  // ========== User Find Methods ==========

  async findAdminByEmail(email: string): Promise<AdminUser | null> {
    return this.db.queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );
  }

  async findAdminById(id: string): Promise<AdminUser | null> {
    return this.db.queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1',
      [id]
    );
  }

  async hasOwner(): Promise<boolean> {
    const owner = await this.db.queryOne<AdminUser>(
      'SELECT id FROM admin_users WHERE role = $1 LIMIT 1',
      [AdminRole.OWNER]
    );
    return owner !== null;
  }

  // ========== Create User ==========

  async createAdmin(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AdminUser> {
    const existing = await this.findAdminByEmail(data.email);
    if (existing) {
      throw new AppError('AUTH_EMAIL_EXISTS', '邮箱已被注册', 400);
    }

    // Check if this is the first user - first user becomes OWNER
    const users = await this.db.query<AdminUser>(
      'SELECT * FROM admin_users LIMIT 1'
    );
    const role = users.length === 0 ? AdminRole.OWNER : AdminRole.MEMBER;

    const password = await bcrypt.hash(data.password, 10);
    const id = this.generateUUID();

    return this.db.queryOne<AdminUser>(
      `INSERT INTO admin_users (id, email, password, name, role, verified, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING *`,
      [id, data.email, password, data.name || null, role]
    );
  }

  // ========== Password Verification ==========

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ========== JWT Token ==========

  generateToken(admin: AdminUser): string {
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin_access',
    };
    console.log('[AdminService] generateToken - payload:', payload);
    return this.jwtService.sign(payload);
  }

  // ========== Login ==========

  async login(dto: LoginDto) {
    const admin = await this.findAdminByEmail(dto.email);
    console.log('[AdminService] Login - found admin:', admin?.id, admin?.email, admin?.role);

    if (!admin) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const isPasswordValid = await this.verifyPassword(dto.password, admin.password);

    if (!isPasswordValid) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const token = this.generateToken(admin);

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      accessToken: token,
      expiresIn: 900,
    };
  }

  // ========== Register (First User) ==========

  async register(dto: RegisterDto) {
    const admin = await this.createAdmin({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    const token = this.generateToken(admin);

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      accessToken: token,
      expiresIn: 900,
    };
  }

  // ========== Invitation Methods ==========

  async createInvitation(
    email: string,
    role: string,
    invitedBy: string
  ): Promise<Invitation> {
    // Check if email already exists
    const existingAdmin = await this.findAdminByEmail(email);
    if (existingAdmin) {
      throw new AppError('ADMIN_EXISTS', '该邮箱已存在管理员账户', 400);
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.db.queryOne<Invitation>(
      `SELECT * FROM admin_invitations
       WHERE email = $1 AND status = 'pending' AND expires_at > NOW()`,
      [email]
    );
    if (existingInvitation) {
      throw new AppError('INVITATION_EXISTS', '该邮箱已有待处理的邀请', 400);
    }

    const id = this.generateUUID();
    const token = this.generateSecureToken();

    // Set expiration to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.db.queryOne<Invitation>(
      `INSERT INTO admin_invitations (id, email, role, token, status, invited_by, expires_at, created_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW())
       RETURNING *`,
      [id, email, role, token, invitedBy, expiresAt]
    );
  }

  async getInvitations(): Promise<Invitation[]> {
    return this.db.query<Invitation>(
      `SELECT * FROM admin_invitations
       WHERE status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC`
    );
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    return this.db.queryOne<Invitation>(
      `SELECT * FROM admin_invitations
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );
  }

  async revokeInvitation(id: string): Promise<void> {
    await this.db.queryOne(
      `UPDATE admin_invitations SET status = 'revoked' WHERE id = $1`,
      [id]
    );
  }

  async acceptInvitation(
    dto: AcceptInvitationDto,
  ): Promise<AdminUser> {
    const invitation = await this.getInvitationByToken(dto.token);

    if (!invitation) {
      throw new AppError('INVITATION_INVALID', '邀请无效或已过期', 400);
    }

    // Create the admin user
    const admin = await this.createAdmin({
      email: invitation.email,
      password: dto.password,
      name: dto.name,
    });

    // Mark invitation as accepted
    await this.db.query(
      `UPDATE admin_invitations SET status = 'accepted' WHERE id = $1`,
      [invitation.id]
    );

    return admin;
  }

  // ========== User Management ==========

  async getUsers(): Promise<AdminUser[]> {
    return this.db.query<AdminUser>(
      'SELECT id, email, name, role, verified, "createdAt", "updatedAt" FROM admin_users ORDER BY "createdAt" ASC'
    );
  }

  async removeUser(
    id: string,
    actorId: string,
    ip: string | null = null,
    userAgent: string | null = null,
  ): Promise<void> {
    // Prevent removing OWNER
    const admin = await this.findAdminById(id);
    if (!admin) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }
    if (admin.role === AdminRole.OWNER) {
      throw new AppError('CANNOT_REMOVE_OWNER', '无法删除所有者', 400);
    }

    await this.db.query('DELETE FROM admin_users WHERE id = $1', [id]);

    await this.safeAudit({ adminId: actorId, action: 'admin.user.remove', targetId: id, targetEmail: admin.email, ip, userAgent });
  }

  async updateUserRole(
    id: string,
    role: string,
    actorId: string,
    ip: string | null = null,
    userAgent: string | null = null,
  ): Promise<AdminUser> {
    if (role !== AdminRole.ADMIN && role !== AdminRole.MEMBER) {
      throw new AppError('INVALID_ROLE', '无效的角色', 400);
    }

    const admin = await this.findAdminById(id);
    if (!admin) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }
    if (admin.role === AdminRole.OWNER) {
      throw new AppError('CANNOT_CHANGE_OWNER_ROLE', '无法修改所有者角色', 400);
    }

    const result = await this.db.queryOne<AdminUser>(
      `UPDATE admin_users SET role = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, email, name, role, verified, "createdAt", "updatedAt"`,
      [role, id]
    );

    await this.safeAudit({ adminId: actorId, action: 'admin.user.update_role', targetId: id, targetEmail: admin.email, metadata: { oldRole: admin.role, newRole: role }, ip, userAgent });

    return result;
  }

  async transferOwner(
    newOwnerId: string,
    ip: string | null = null,
    userAgent: string | null = null,
  ): Promise<{ newOwner: AdminUser; oldOwner: AdminUser }> {
    const newOwner = await this.findAdminById(newOwnerId);
    if (!newOwner) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }
    if (newOwner.role === AdminRole.OWNER) {
      throw new AppError('ALREADY_OWNER', '该用户已是所有者', 400);
    }

    // Find the current owner first (by role, should be only one)
    const currentOwner = await this.db.queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE role = $1',
      [AdminRole.OWNER]
    );
    if (!currentOwner) {
      throw new AppError('NO_OWNER', '未找到当前所有者', 400);
    }

    // Set new owner as OWNER
    const updatedNewOwner = await this.db.queryOne<AdminUser>(
      `UPDATE admin_users SET role = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, email, name, role, verified, "createdAt", "updatedAt"`,
      [AdminRole.OWNER, newOwnerId]
    );

    // Demote the old owner to ADMIN (use specific ID, not role)
    const updatedOldOwner = await this.db.queryOne<AdminUser>(
      `UPDATE admin_users SET role = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, email, name, role, verified, "createdAt", "updatedAt"`,
      [AdminRole.ADMIN, currentOwner.id]
    );

    await this.safeAudit({ adminId: currentOwner.id, action: 'admin.user.transfer_owner', targetId: newOwnerId, targetEmail: newOwner.email, metadata: { oldOwnerId: currentOwner.id, newOwnerId }, ip, userAgent });

    return { newOwner: updatedNewOwner, oldOwner: updatedOldOwner };
  }

  async getStats(): Promise<{
    totalUsers: number;
    pendingInvitations: number;
    activeSessions: number;
  }> {
    const usersResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM admin_users'
    );
    const totalUsers = parseInt(usersResult[0]?.count || '0', 10);

    const invitationsResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_invitations
       WHERE status = 'pending' AND expires_at > NOW()`
    );
    const pendingInvitations = parseInt(invitationsResult[0]?.count || '0', 10);

    // For active sessions, we can use a simple approach:
    // Count recently active users (logged in within last hour)
    // Or return 0 if we don't track sessions yet
    const activeSessions = 0;

    return {
      totalUsers,
      pendingInvitations,
      activeSessions,
    };
  }

  async updateProfile(id: string, name: string): Promise<AdminUser> {
    const result = await this.db.queryOne<AdminUser>(
      `UPDATE admin_users SET name = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, email, name, role, verified, "createdAt", "updatedAt"`,
      [name, id]
    );
    return result;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    actorId: string,
    ip: string | null = null,
    userAgent: string | null = null,
  ): Promise<void> {
    const admin = await this.findAdminById(id);
    if (!admin) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const isPasswordValid = await this.verifyPassword(currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new AppError('INVALID_PASSWORD', '当前密码错误', 400);
    }

    const password = await bcrypt.hash(newPassword, 10);
    await this.db.query(
      `UPDATE admin_users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
      [password, id]
    );

    await this.safeAudit({ adminId: actorId, action: 'admin.user.change_password', targetId: id, targetEmail: admin.email, ip, userAgent });
  }

  // ========== Verification Code Methods ==========

  async createVerificationCode(
    email: string,
    type: string = 'reset_password'
  ): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this email and type
    await this.db.query(
      `DELETE FROM client_verification_codes WHERE email = $1 AND type = $2`,
      [email, type]
    );

    // Insert new code
    await this.db.query(
      `INSERT INTO client_verification_codes (id, email, code, type, expires_at, attempts, "createdAt")
       VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
      [this.generateUUID(), email, code, type, expiresAt]
    );

    return code;
  }

  async verifyCode(email: string, code: string, type: string): Promise<boolean> {
    const record = await this.db.queryOne<{
      code: string;
      expires_at: Date;
      attempts: number;
    }>(
      `SELECT * FROM client_verification_codes
       WHERE email = $1 AND type = $2 AND expires_at > NOW()`,
      [email, type]
    );

    if (!record) {
      return false;
    }

    if (record.code !== code) {
      // Increment error count
      await this.db.query(
        `UPDATE client_verification_codes SET attempts = attempts + 1 WHERE id = (
          SELECT id FROM client_verification_codes WHERE email = $1 AND type = $2
        )`,
        [email, type]
      );
      return false;
    }

    return true;
  }

  async sendResetCode(
    email: string,
    captchaToken: string,
    captchaAnswer: string[]
  ): Promise<void> {
    // 1. Verify captcha
    const captchaValid = await this.captchaService.verifyCaptcha(captchaToken, captchaAnswer);
    if (!captchaValid) {
      throw new AppError('INVALID_CAPTCHA', '图形验证失败', 400);
    }

    const admin = await this.findAdminByEmail(email);
    if (!admin) {
      // Don't reveal if email exists
      return;
    }

    const code = await this.createVerificationCode(email, 'reset_password');

    await this.emailService.sendVerificationCode(email, code);
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    const admin = await this.findAdminByEmail(email);
    if (!admin) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const isValid = await this.verifyCode(email, code, 'reset_password');
    if (!isValid) {
      throw new AppError('INVALID_CODE', '验证码无效或已过期', 400);
    }

    const password = await bcrypt.hash(newPassword, 10);
    await this.db.query(
      `UPDATE admin_users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
      [password, admin.id]
    );

    // Delete the used code
    await this.db.query(
      `DELETE FROM client_verification_codes WHERE email = $1 AND type = 'reset_password'`,
      [email]
    );

    await this.safeAudit({
      adminId: null,
      action: 'admin.user.reset_password',
      targetId: null,
      targetEmail: email,
    });
  }

  // ========== Helpers ==========

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}