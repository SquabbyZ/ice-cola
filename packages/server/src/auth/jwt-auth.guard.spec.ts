import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let request: { headers: { authorization?: string }; user?: unknown };

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };
    request = {
      headers: {},
    };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService,
    );
  });

  function createContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('accepts access tokens and attaches the payload', () => {
    request.headers.authorization = 'Bearer access-token';
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', type: 'access' });

    expect(guard.canActivate(createContext())).toBe(true);
    expect(request.user).toMatchObject({ id: 'user-1', sub: 'user-1', type: 'access' });
  });

  it('rejects refresh tokens', () => {
    request.headers.authorization = 'Bearer refresh-token';
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', type: 'refresh' });

    expect(guard.canActivate(createContext())).toBe(false);
    expect(request.user).toBeUndefined();
  });

  it('fails closed when JWT secret is missing', () => {
    expect(() => new JwtAuthGuard(
      jwtService as unknown as JwtService,
      { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
    )).toThrow('JWT_SECRET is not configured');
  });
});
