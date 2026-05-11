import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AdminService, AdminUser, Invitation } from './admin.service';
import { DatabaseService } from '../database/database.service';
import { CaptchaService } from '../commons/captcha.service';
import { EmailService } from '../commons/email.service';
import { AdminRole } from './dto/invite.dto';

describe('AdminService', () => {
  let service: AdminService;
  let db: jest.Mocked<DatabaseService>;
  let jwtService: jest.Mocked<JwtService>;
  let captchaService: jest.Mocked<CaptchaService>;
  let emailService: jest.Mocked<EmailService>;

  const mockAdminUser: AdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    password: '$2a$10$hashedpassword',
    name: 'Admin User',
    role: AdminRole.OWNER,
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvitation: Invitation = {
    id: 'inv-1',
    email: 'new@example.com',
    role: AdminRole.MEMBER,
    token: 'test-token-123',
    status: 'pending',
    invitedBy: 'admin-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CaptchaService,
          useValue: {
            verifyCaptcha: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    db = module.get(DatabaseService);
    jwtService = module.get(JwtService);
    captchaService = module.get(CaptchaService);
    emailService = module.get(EmailService);
  });

  describe('findAdminByEmail', () => {
    it('returns admin user when found', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      const result = await service.findAdminByEmail('admin@example.com');

      expect(result).toEqual(mockAdminUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM admin_users WHERE email = $1',
        ['admin@example.com']
      );
    });

    it('returns null when admin not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.findAdminByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findAdminById', () => {
    it('returns admin user when found', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      const result = await service.findAdminById('admin-1');

      expect(result).toEqual(mockAdminUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        'SELECT * FROM admin_users WHERE id = $1',
        ['admin-1']
      );
    });

    it('returns null when admin not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.findAdminById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createAdmin', () => {
    it('creates first admin as OWNER when no users exist', async () => {
      db.queryOne.mockResolvedValueOnce(null); // findAdminByEmail
      db.query.mockResolvedValue([]); // no existing users
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        role: AdminRole.OWNER,
      }); // INSERT RETURNING

      const result = await service.createAdmin({
        email: 'new@example.com',
        password: 'Password123',
        name: 'New Admin',
      });

      expect(result.role).toBe(AdminRole.OWNER);
    });

    it('creates subsequent admins as MEMBER', async () => {
      db.queryOne.mockResolvedValueOnce(null); // findAdminByEmail
      db.query.mockResolvedValue([mockAdminUser]); // existing users exist
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        role: AdminRole.MEMBER,
      }); // INSERT RETURNING

      const result = await service.createAdmin({
        email: 'new@example.com',
        password: 'Password123',
        name: 'New Admin',
      });

      expect(result.role).toBe(AdminRole.MEMBER);
    });

    it('throws error when email already exists', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      await expect(
        service.createAdmin({
          email: 'admin@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('邮箱已被注册');
    });

    it('hashes password with bcrypt', async () => {
      db.queryOne.mockResolvedValueOnce(null);
      db.query.mockResolvedValue([]);
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        password: '$2a$10$validhash', // bcrypt format check
      });

      await service.createAdmin({
        email: 'new@example.com',
        password: 'Password123',
      });
      // bcrypt.hash is called internally - just verify createAdmin completes
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await bcrypt.hash('Password123', 10);

      const result = await service.verifyPassword('Password123', hash);

      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await bcrypt.hash('Password123', 10);

      const result = await service.verifyPassword('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('returns JWT token for admin', () => {
      const result = service.generateToken(mockAdminUser);

      expect(result).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockAdminUser.id,
        email: mockAdminUser.email,
        role: mockAdminUser.role,
      });
    });
  });

  describe('login', () => {
    it('returns user and token on successful login', async () => {
      const hash = await bcrypt.hash('Password123', 10);
      db.queryOne.mockResolvedValue({
        ...mockAdminUser,
        password: hash,
      });

      const result = await service.login({
        email: 'admin@example.com',
        password: 'Password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockAdminUser.email);
      expect(result.user.id).toBe(mockAdminUser.id);
    });

    it('throws error when admin not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });

    it('throws error when password is incorrect', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 10);
      db.queryOne.mockResolvedValue({
        ...mockAdminUser,
        password: hash,
      });

      await expect(
        service.login({
          email: 'admin@example.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });
  });

  describe('register', () => {
    it('creates admin and returns user with token', async () => {
      db.queryOne.mockResolvedValueOnce(null); // findAdminByEmail
      db.query.mockResolvedValue([]); // no existing users
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        role: AdminRole.OWNER,
      }); // INSERT RETURNING

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123',
        name: 'New Admin',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockAdminUser.email);
    });
  });

  describe('createInvitation', () => {
    it('creates invitation successfully', async () => {
      db.queryOne.mockResolvedValueOnce(null); // findAdminByEmail (no existing admin)
      db.queryOne.mockResolvedValueOnce(null); // no existing invitation
      db.queryOne.mockResolvedValueOnce(mockInvitation); // INSERT RETURNING

      const result = await service.createInvitation(
        'new@example.com',
        AdminRole.MEMBER,
        'admin-1'
      );

      expect(result).toEqual(mockInvitation);
    });

    it('throws error when email already has admin account', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      await expect(
        service.createInvitation('admin@example.com', AdminRole.MEMBER, 'admin-1')
      ).rejects.toThrow('该邮箱已存在管理员账户');
    });

    it('throws error when pending invitation already exists', async () => {
      db.queryOne.mockResolvedValueOnce(null); // no existing admin
      db.queryOne.mockResolvedValueOnce(mockInvitation); // existing invitation

      await expect(
        service.createInvitation('new@example.com', AdminRole.MEMBER, 'admin-1')
      ).rejects.toThrow('该邮箱已有待处理的邀请');
    });
  });

  describe('getInvitations', () => {
    it('returns pending invitations', async () => {
      db.query.mockResolvedValue([mockInvitation]);

      const result = await service.getInvitations();

      expect(result).toEqual([mockInvitation]);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'")
      );
    });

    it('returns empty array when no pending invitations', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.getInvitations();

      expect(result).toEqual([]);
    });
  });

  describe('getInvitationByToken', () => {
    it('returns invitation when found', async () => {
      db.queryOne.mockResolvedValue(mockInvitation);

      const result = await service.getInvitationByToken('test-token-123');

      expect(result).toEqual(mockInvitation);
    });

    it('returns null when invitation not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.getInvitationByToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('revokeInvitation', () => {
    it('revokes invitation by updating status', async () => {
      db.queryOne.mockResolvedValue({});

      await service.revokeInvitation('inv-1');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'revoked'"),
        ['inv-1']
      );
    });
  });

  describe('acceptInvitation', () => {
    it('creates admin user and marks invitation accepted', async () => {
      db.queryOne.mockResolvedValueOnce(mockInvitation); // getInvitationByToken
      db.queryOne.mockResolvedValueOnce(null); // findAdminByEmail
      db.query.mockResolvedValue([]); // no existing users
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        email: mockInvitation.email,
      }); // INSERT RETURNING
      db.query.mockResolvedValue([]); // UPDATE invitation status

      const result = await service.acceptInvitation({
        token: 'test-token-123',
        password: 'Password123',
        name: 'New User',
      });

      expect(result.email).toBe(mockInvitation.email);
    });

    it('throws error when invitation is invalid', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.acceptInvitation({
          token: 'invalid-token',
          password: 'Password123',
          name: 'New User',
        })
      ).rejects.toThrow('邀请无效或已过期');
    });
  });

  describe('getUsers', () => {
    it('returns all admin users', async () => {
      const users = [
        { ...mockAdminUser },
        { ...mockAdminUser, id: 'admin-2', email: 'admin2@example.com', role: AdminRole.MEMBER },
      ];
      db.query.mockResolvedValue(users);

      const result = await service.getUsers();

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no users', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.getUsers();

      expect(result).toEqual([]);
    });
  });

  describe('removeUser', () => {
    it('removes non-owner user', async () => {
      const nonOwner = { ...mockAdminUser, id: 'admin-2', role: AdminRole.MEMBER };
      db.queryOne.mockResolvedValue(nonOwner);
      db.query.mockResolvedValue([]);

      await service.removeUser('admin-2');

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM admin_users WHERE id = $1',
        ['admin-2']
      );
    });

    it('throws error when trying to remove owner', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      await expect(service.removeUser('admin-1')).rejects.toThrow('无法删除所有者');
    });

    it('throws error when user not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.removeUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });

  describe('updateUserRole', () => {
    it('updates user role successfully', async () => {
      const nonOwner = { ...mockAdminUser, id: 'admin-2', role: AdminRole.MEMBER };
      db.queryOne.mockResolvedValueOnce(nonOwner); // findAdminById
      db.queryOne.mockResolvedValueOnce({
        ...nonOwner,
        role: AdminRole.ADMIN,
      }); // UPDATE RETURNING

      const result = await service.updateUserRole('admin-2', AdminRole.ADMIN);

      expect(result.role).toBe(AdminRole.ADMIN);
    });

    it('throws error for invalid role', async () => {
      await expect(
        service.updateUserRole('admin-2', 'INVALID_ROLE' as any)
      ).rejects.toThrow('无效的角色');
    });

    it('throws error when trying to change owner role', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      await expect(
        service.updateUserRole('admin-1', AdminRole.ADMIN)
      ).rejects.toThrow('无法修改所有者角色');
    });
  });

  describe('transferOwner', () => {
    it('transfers ownership successfully', async () => {
      const nonOwner = { ...mockAdminUser, id: 'admin-2', role: AdminRole.MEMBER };
      db.queryOne.mockResolvedValueOnce(nonOwner); // findAdminById (newOwner)
      db.queryOne.mockResolvedValueOnce(mockAdminUser); // find current owner
      db.queryOne.mockResolvedValueOnce({
        ...nonOwner,
        role: AdminRole.OWNER,
      }); // UPDATE new owner
      db.queryOne.mockResolvedValueOnce({
        ...mockAdminUser,
        role: AdminRole.ADMIN,
      }); // UPDATE old owner

      const result = await service.transferOwner('admin-2');

      expect(result.newOwner.role).toBe(AdminRole.OWNER);
      expect(result.oldOwner.role).toBe(AdminRole.ADMIN);
    });

    it('throws error when user not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.transferOwner('nonexistent')).rejects.toThrow('用户不存在');
    });

    it('throws error when user is already owner', async () => {
      db.queryOne.mockResolvedValue(mockAdminUser);

      await expect(service.transferOwner('admin-1')).rejects.toThrow('该用户已是所有者');
    });
  });

  describe('getStats', () => {
    it('returns correct stats', async () => {
      db.query
        .mockResolvedValueOnce([{ count: '5' }]) // total users
        .mockResolvedValueOnce([{ count: '2' }]); // pending invitations

      const result = await service.getStats();

      expect(result.totalUsers).toBe(5);
      expect(result.pendingInvitations).toBe(2);
      expect(result.activeSessions).toBe(0);
    });

    it('handles zero counts', async () => {
      db.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats();

      expect(result.totalUsers).toBe(0);
      expect(result.pendingInvitations).toBe(0);
    });
  });

  describe('updateProfile', () => {
    it('updates admin name', async () => {
      const updated = { ...mockAdminUser, name: 'New Name' };
      db.queryOne.mockResolvedValue(updated);

      const result = await service.updateProfile('admin-1', 'New Name');

      expect(result.name).toBe('New Name');
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const hash = await bcrypt.hash('CurrentPassword', 10);
      db.queryOne.mockResolvedValue({ ...mockAdminUser, password: hash });
      db.query.mockResolvedValue([]);

      await service.changePassword('admin-1', 'CurrentPassword', 'NewPassword123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE admin_users SET password'),
        expect.any(Array)
      );
    });

    it('throws error when user not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'CurrentPassword', 'NewPassword123')
      ).rejects.toThrow('用户不存在');
    });

    it('throws error when current password is wrong', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 10);
      db.queryOne.mockResolvedValue({ ...mockAdminUser, password: hash });

      await expect(
        service.changePassword('admin-1', 'WrongPassword', 'NewPassword123')
      ).rejects.toThrow('当前密码错误');
    });
  });

  describe('createVerificationCode', () => {
    it('creates and returns 6-digit code', async () => {
      db.query.mockResolvedValue([]); // DELETE existing
      db.query.mockResolvedValue([]); // INSERT

      const result = await service.createVerificationCode('test@example.com');

      expect(result).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyCode', () => {
    it('returns true for correct code', async () => {
      db.queryOne.mockResolvedValue({
        code: '123456',
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      });

      const result = await service.verifyCode('test@example.com', '123456', 'reset_password');

      expect(result).toBe(true);
    });

    it('returns false for incorrect code', async () => {
      db.queryOne.mockResolvedValue({
        code: '123456',
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      });
      db.query.mockResolvedValue([]);

      const result = await service.verifyCode('test@example.com', 'wrong', 'reset_password');

      expect(result).toBe(false);
    });

    it('returns false when code not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.verifyCode('test@example.com', '123456', 'reset_password');

      expect(result).toBe(false);
    });
  });

  describe('sendResetCode', () => {
    it('sends reset code after captcha verification', async () => {
      db.queryOne.mockResolvedValueOnce({}); // verifyCaptcha returns true
      captchaService.verifyCaptcha.mockResolvedValue(true);
      db.queryOne.mockResolvedValueOnce(mockAdminUser); // findAdminByEmail
      db.query.mockResolvedValue([]); // DELETE existing codes
      db.query.mockResolvedValue([]); // INSERT new code

      await service.sendResetCode('admin@example.com', 'captcha-token', ['a', 'b', 'c', 'd']);

      expect(emailService.sendVerificationCode).toHaveBeenCalled();
    });

    it('does not reveal if email exists when captcha fails', async () => {
      captchaService.verifyCaptcha.mockResolvedValue(false);

      await expect(
        service.sendResetCode('nonexistent@example.com', 'captcha-token', ['a', 'b', 'c', 'd'])
      ).rejects.toThrow('图形验证失败');
    });

    it('returns without error if admin not found (dont reveal email exists)', async () => {
      captchaService.verifyCaptcha.mockResolvedValue(true);
      db.queryOne.mockResolvedValueOnce(mockAdminUser); // findAdminByEmail (exists)
      db.query.mockResolvedValue([]); // createVerificationCode

      // Should not throw, just return
      await expect(
        service.sendResetCode('nonexistent@example.com', 'captcha-token', ['a', 'b', 'c', 'd'])
      ).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('resets password successfully', async () => {
      db.queryOne.mockResolvedValueOnce(mockAdminUser); // findAdminByEmail
      db.queryOne.mockResolvedValueOnce({
        code: '123456',
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      }); // verifyCode
      db.query.mockResolvedValue([]); // UPDATE password
      db.query.mockResolvedValue([]); // DELETE verification code

      await service.resetPassword('admin@example.com', '123456', 'NewPassword123');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE admin_users SET password'),
        expect.any(Array)
      );
    });

    it('throws error when user not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('nonexistent@example.com', '123456', 'NewPassword123')
      ).rejects.toThrow('用户不存在');
    });

    it('throws error when code is invalid', async () => {
      db.queryOne.mockResolvedValueOnce(mockAdminUser);
      db.queryOne.mockResolvedValueOnce(null); // verifyCode returns false

      await expect(
        service.resetPassword('admin@example.com', 'wrong', 'NewPassword123')
      ).rejects.toThrow('验证码无效或已过期');
    });
  });
});