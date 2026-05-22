import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentAuthUser {
  sub: string;
  id: string;
  email: string;
  teamId?: string | null;
  role: string;
  authType?: 'user' | 'admin';
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentAuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentAuthUser;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
