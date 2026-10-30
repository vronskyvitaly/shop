'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { getErrorMessage } from '@/lib/api/errors';
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from '@/lib/validation/auth.schemas';
import { useLoginMutation, useRegisterMutation } from '../api';

// Куда вернуться после входа: ?next=/cart. Только внутренние пути — иначе
// ссылка вида /login?next=https://evil.site увела бы пользователя на чужой сайт
function useNext() {
  const next = useSearchParams().get('next');
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

// Ссылка на соседнюю форму с тем же ?next
function useSwitchHref(path: string) {
  const next = useSearchParams().get('next');
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function LoginForm() {
  const router = useRouter();
  const next = useNext();
  const registerHref = useSwitchHref('/register');
  const [login, { isLoading, isError, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginValues) => {
    const result = await login(values);
    if (!result.error) router.replace(next); // ошибку покажет FormError
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <h1 className="text-2xl font-bold">Вход</h1>
      <FormError message={isError ? getErrorMessage(error) : undefined} />
      <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Field
        label="Пароль"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" loading={isLoading}>
        Войти
      </Button>
      <p className="text-center text-sm text-zinc-500">
        Нет аккаунта?{' '}
        <Link href={registerHref} className="font-medium text-blue-600 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const next = useNext();
  const loginHref = useSwitchHref('/login');
  const [registerUser, { isLoading, isError, error }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', name: '', password: '', confirmPassword: '', demoAccepted: false },
  });
  const demoAccepted = useWatch({ control, name: 'demoAccepted' });

  const onSubmit = async (values: RegisterValues) => {
    const result = await registerUser(values);
    if (!result.error) router.replace(next);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <h1 className="text-2xl font-bold">Регистрация</h1>
      <FormError message={isError ? getErrorMessage(error) : undefined} />
      <Field label="Имя" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Field
        label="Пароль"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Field
        label="Повторите пароль"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {/* Без согласия аккаунт не создать: кнопка неактивна, схема тоже не пропустит */}
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-zinc-600">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-blue-600"
            aria-invalid={Boolean(errors.demoAccepted)}
            {...register('demoAccepted')}
          />
          <span>
            Я понимаю, что это демо-версия: товары, цены и заказы вымышлены, а разработчик не несёт ответственности
          </span>
        </label>
        {errors.demoAccepted && <p className="text-xs text-rose-600">{errors.demoAccepted.message}</p>}
      </div>
      <Button type="submit" size="lg" loading={isLoading} disabled={!demoAccepted}>
        Создать аккаунт
      </Button>
      <p className="text-center text-sm text-zinc-500">
        Уже есть аккаунт?{' '}
        <Link href={loginHref} className="font-medium text-blue-600 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
