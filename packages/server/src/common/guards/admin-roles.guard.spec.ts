import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../admin-admin/dto/invite.dto';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';
import { AdminRolesGuard } from './admin-roles.guard';

describe('AdminRolesGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let request: { user?: { authType?: string; role?: string } };
  let guard: AdminRolesGuard;

  const handler = jest.fn();
  const contextClass = class TestController {};

  const createContext = (): ExecutionContext => ({
    getHandler: () => handler,
    getClass: () => contextClass,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext);

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([AdminRole.OWNER, AdminRole.ADMIN]),
    };
    request = {
      user: {
        authType: 'admin',
        role: AdminRole.OWNER,
      },
    };
    guard = new AdminRolesGuard(reflector as unknown as Reflector);
  });

  it('allows admin owners and admins', () => {
    expect(guard.canActivate(createContext())).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ADMIN_ROLES_KEY, [handler, contextClass]);

    request = {
      user: {
        authType: 'admin',
        role: AdminRole.ADMIN,
      },
    };
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('rejects admin members', () => {
    request = {
      user: {
        authType: 'admin',
        role: AdminRole.MEMBER,
      },
    };

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('rejects non-admin authenticated users even when their role names match', () => {
    request = {
      user: {
        authType: 'user',
        role: AdminRole.OWNER,
      },
    };

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('allows routes without admin role metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });
});
