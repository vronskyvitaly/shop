import { Role } from '@prisma/client';
import { IsIn } from 'class-validator';

// Администратор в магазине один — назначить роль ADMIN через API нельзя
export const ASSIGNABLE_ROLES = [Role.USER, Role.PICKER, Role.COURIER] as const;

export class UpdateRoleDto {
  @IsIn(ASSIGNABLE_ROLES, {
    message: 'Можно назначить только покупателя, сборщика или курьера',
  })
  readonly role: (typeof ASSIGNABLE_ROLES)[number];
}
