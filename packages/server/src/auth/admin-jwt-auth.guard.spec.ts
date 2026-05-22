import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';

describe('AdminJwtAuthGuard', () => {
  let guard: AdminJwtAuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let db: jest.Mocked<Pick<DatabaseService, 'queryOne'>>;
  let request: { headers: Record<string, string>; user?: unknown };

  const createContext = (): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };
    db = {
      queryOne: jest.fn(),
    };
    request = {
      headers: {
        authorization: 'Bearer admin-token-1',
      },
    };

    guard = new AdminJwtAuthGuard(
      jwtService as unknown as JwtService,
      { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      db as unknown as DatabaseService,
    );
  });

  it('accepts admin access tokens and resolves admin users from admin_users', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', type: 'admin_access' } as any);
    db.queryOne.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'OWNER',
    } as any);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(db.queryOne).toHaveBeenCalledWith(
      'SELECT id, email, role FROM admin_users WHERE id = $1',
      ['admin-1'],
    );
    expect(request.user).toEqual({
      sub: 'admin-1',
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'OWNER',
      authType: 'admin',
    });
  });

  it('rejects regular user access tokens', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access' } as any);

    await expect(guard.canActivate(createContext())).resolves.toBe(false);
    expect(db.queryOne).not.toHaveBeenCalled();
  });

  it('rejects admin access tokens when the admin no longer exists', async () => {
    jwtService.verify.mockReturnValue({ sub: 'admin-1', type: 'admin_access' } as any);
    db.queryOne.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).resolves.toBe(false);
  });
});
