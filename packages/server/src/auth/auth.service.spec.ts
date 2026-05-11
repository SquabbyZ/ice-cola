import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import bcrypt from 'bcryptjs';
import { AppError } from '../common/interfaces/errors';
import { mockDeep } from 'jest-mock-extended';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let db: jest.Mocked<DatabaseService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    name: 'Test User',
    teamId: 'team-1',
    role: 'MEMBER',
    team_name: 'Test Team',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: {
            findUserByEmail: jest.fn(),
            createUser: jest.fn(),
            findUserById: jest.fn(),
            queryOne: jest.fn(),
            updateUserPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = module.get(DatabaseService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('throws error when email already exists', async () => {
      db.findUserByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'password123', name: 'Test' })
      ).rejects.toThrow(AppError);
    });

    it('creates user and returns tokens on successful registration', async () => {
      db.findUserByEmail.mockResolvedValue(null);
      db.createUser.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
    });
  });

  describe('login', () => {
    it('throws error when user not found', async () => {
      db.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow(AppError);
    });

    it('throws error when password is invalid', async () => {
      db.findUserByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow(AppError);
    });

    it('returns user and tokens on successful login', async () => {
      db.findUserByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jwtService.signAsync.mockResolvedValue('token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('token');
    });
  });

  describe('logout', () => {
    it('returns success', async () => {
      const result = await service.logout('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('changePassword', () => {
    it('throws error when user not found', async () => {
      db.findUserById.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', 'old', 'new')
      ).rejects.toThrow(AppError);
    });

    it('throws error when current password is wrong', async () => {
      db.findUserById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(
        service.changePassword('user-1', 'wrong', 'new')
      ).rejects.toThrow(AppError);
    });

    it('successfully changes password', async () => {
      db.findUserById.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('newhash'));
      db.updateUserPassword.mockResolvedValue(undefined);

      const result = await service.changePassword('user-1', 'old', 'new');

      expect(result.success).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('throws error when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.refreshToken({ refreshToken: 'invalid-token' })
      ).rejects.toThrow(AppError);
    });

    it('throws error when token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access' });

      await expect(
        service.refreshToken({ refreshToken: 'some-token' })
      ).rejects.toThrow(AppError);
    });

    it('throws error when user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'some-token' })
      ).rejects.toThrow(AppError);
    });

    it('returns new access token on success', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      db.queryOne.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken({ refreshToken: 'some-token' });

      expect(result.accessToken).toBe('new-token');
    });
  });

  describe('getCurrentUser', () => {
    it('throws error when user not found', async () => {
      db.findUserById.mockResolvedValue(null);

      await expect(service.getCurrentUser('user-1')).rejects.toThrow(AppError);
    });

    it('returns user with team info', async () => {
      db.findUserById.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result.team).toBeDefined();
    });

    it('returns user without team info', async () => {
      db.findUserById.mockResolvedValue({ ...mockUser, teamId: null });

      const result = await service.getCurrentUser('user-1');

      expect(result.team).toBeNull();
    });
  });
});