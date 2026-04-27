import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '../../quota/quota.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);
