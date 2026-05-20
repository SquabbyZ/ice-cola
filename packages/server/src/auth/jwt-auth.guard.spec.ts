import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let db: jest.Mocked<Pick<DatabaseService, 'findUserById'>>;
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
      findUserById: jest.fn(),
    };
    request = {
      headers: {
        authorization: 'Bearer token-1',
      },
    };

    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      db as unknown as DatabaseService,
    );
  });

  it('uses the current database team and role instead of stale JWT claims', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access', teamId: '', role: 'MEMBER' } as any);
    db.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'OWNER',
    } as any);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);

    expect(request.user).toEqual({
      sub: 'user-1',
      id: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'OWNER',
    });
  });

  it('rejects refresh tokens for protected routes', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' } as any);

    await expect(guard.canActivate(createContext())).resolves.toBe(false);
    expect(db.findUserById).not.toHaveBeenCalled();
  });

  it('rejects tokens when the user no longer exists', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access' } as any);
    db.findUserById.mockResolvedValue(null);

    await expect(guard.canActivate(createContext())).resolves.toBe(false);
  });
});
