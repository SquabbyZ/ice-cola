import type { User } from '@/services/auth-service';

export function getTeamId(user: User | null): string | null {
  return user?.team?.id ?? null;
}
