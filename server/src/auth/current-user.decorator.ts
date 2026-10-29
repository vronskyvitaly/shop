import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.types.js';

// @CurrentUser() user — fetches the user that JwtAuthGuard placed
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().user,
);
