import type { User } from '@/services/auth-service';

export function getTeamId(user: User | null | undefined): string | null {
  return user?.team?.id ?? null;
}
