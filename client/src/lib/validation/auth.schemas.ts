import { z } from 'zod';

// Правила совпадают с DTO на сервере (CreateUserDto, LoginDto),
// чтобы ошибки показывались сразу в форме, а не после запроса

export const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль').max(72, 'Не больше 72 символов'),
});

export const registerSchema = z
  .object({
    email: z.email('Введите корректный email'),
    name: z.string().trim().min(1, 'Введите имя').max(50, 'Не больше 50 символов'),
    password: z.string().min(8, 'Минимум 8 символов').max(72, 'Не больше 72 символов'),
    confirmPassword: z.string(),
    // Согласие, что магазин демо (блок под формой). Только для формы — на сервер не уходит
    demoAccepted: z.boolean().refine(Boolean, 'Подтвердите, что понимаете: это демо-версия'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

// Совпадают с UpdateProfileDto и ChangePasswordDto на сервере
export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя').max(50, 'Не больше 50 символов'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль').max(72),
    newPassword: z.string().min(8, 'Минимум 8 символов').max(72, 'Не больше 72 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Новый пароль совпадает с текущим',
    path: ['newPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
