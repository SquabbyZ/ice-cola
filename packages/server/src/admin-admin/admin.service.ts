import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AdminRole,
  CreateInvitationDto,
  AcceptInvitationDto,
} from './dto/invite.dto';

export interface AdminUser {
  id: string;
  email: string;
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
  ) {}

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
    };

    return this.jwtService.sign(payload);
  }

  // ========== Login ==========

  async login(dto: LoginDto) {
    const admin = await this.findAdminByEmail(dto.email);

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

  async removeUser(id: string): Promise<void> {
    // Prevent removing OWNER
    const admin = await this.findAdminById(id);
    if (!admin) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }
    if (admin.role === AdminRole.OWNER) {
      throw new AppError('CANNOT_REMOVE_OWNER', '无法删除所有者', 400);
    }

    await this.db.query('DELETE FROM admin_users WHERE id = $1', [id]);
  }

  // ========== Verification Code Methods ==========

  async createVerificationCode(
    email: string,
    type: string = 'reset_password'
  ): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store or update the code
    await this.db.query(
      `INSERT INTO client_verification_codes (id, email, code, type, expires_at, error_count, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())
       ON CONFLICT (email) WHERE type = $4
       DO UPDATE SET code = $3, expires_at = $5, error_count = 0, created_at = NOW()`,
      [this.generateUUID(), email, code, type, expiresAt]
    );

    return code;
  }

  async verifyCode(email: string, code: string, type: string): Promise<boolean> {
    const record = await this.db.queryOne<{
      code: string;
      expires_at: Date;
      error_count: number;
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
        `UPDATE client_verification_codes SET error_count = error_count + 1 WHERE id = (
          SELECT id FROM client_verification_codes WHERE email = $1 AND type = $2
        )`,
        [email, type]
      );
      return false;
    }

    return true;
  }

  async sendResetCode(email: string): Promise<void> {
    const admin = await this.findAdminByEmail(email);
    if (!admin) {
      // Don't reveal if email exists
      return;
    }

    const code = await this.createVerificationCode(email, 'reset_password');

    // TODO: In production, send email with code
    // For now, we'll just log it
    console.log(`Reset code for ${email}: ${code}`);
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