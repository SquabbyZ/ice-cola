import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../admin-admin/dto/invite.dto';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

interface AdminRoleRequest {
  user?: {
    authType?: string;
    role?: string;
  };
}

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AdminRoleRequest>();
    return user?.authType === 'admin' && requiredRoles.includes(user.role as AdminRole);
  }
}
