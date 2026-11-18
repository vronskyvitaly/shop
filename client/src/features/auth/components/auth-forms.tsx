'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, PasswordField } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { getErrorMessage } from '@/lib/api/errors';
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from '@/lib/validation/auth.schemas';
import { useLoginMutation, useRegisterMutation } from '../api';
import { PasswordChecks } from './password-checks';

// Заголовок формы с короткой подписью
function FormTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1 pr-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}

// inModal — форма открыта модалкой поверх страницы (app/@auth/(.)login, (.)register)
type AuthFormProps = { inModal?: boolean };

// Куда уйти после входа. ?next=/cart — туда (только внутренние пути, иначе
// ссылка вида /login?next=https://evil.site увела бы пользователя на чужой сайт).
// Без ?next: из модалки — закрыть её и остаться на странице под ней, со страницы /login — на главную
function useAfterAuth(inModal: boolean) {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : null;
  return () => {
    if (safeNext) router.replace(safeNext);
    else if (inModal) router.back();
    else router.replace('/');
  };
}

// Ссылка на соседнюю форму с тем же ?next
function useSwitchHref(path: string) {
  const next = useSearchParams().get('next');
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function LoginForm({ inModal = false }: AuthFormProps) {
  const afterAuth = useAfterAuth(inModal);
  const registerHref = useSwitchHref('/register');
  const [login, { isLoading, isError, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginValues) => {
    const result = await login(values);
    if (!result.error) afterAuth(); // ошибку покажет FormError
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormTitle title="Вход" subtitle="Войдите, чтобы оформлять заказы и следить за ними" />
      <FormError message={isError ? getErrorMessage(error) : undefined} />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Пароль"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" loading={isLoading}>
        Войти
      </Button>
      {/* В модалке replace: «Назад» закрывает модалку, а не возвращает к соседней форме */}
      <p className="text-center text-sm text-zinc-500">
        Нет аккаунта?{' '}
        <Link href={registerHref} replace={inModal} className="font-medium text-blue-600 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ inModal = false }: AuthFormProps) {
  const afterAuth = useAfterAuth(inModal);
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
  const [password, confirmPassword, demoAccepted] = useWatch({
    control,
    name: ['password', 'confirmPassword', 'demoAccepted'],
  });

  const onSubmit = async (values: RegisterValues) => {
    const result = await registerUser(values);
    if (!result.error) afterAuth();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormTitle title="Регистрация" subtitle="Пара полей — и можно собирать корзину" />
      <FormError message={isError ? getErrorMessage(error) : undefined} />
      <Field
        label="Имя"
        autoComplete="name"
        placeholder="Как к вам обращаться"
        error={errors.name?.message}
        {...register('name')}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Пароль"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        label="Повторите пароль"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <PasswordChecks password={password} confirm={confirmPassword} />
      {/* Без согласия аккаунт не создать: кнопка неактивна, схема тоже не пропустит */}
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 transition hover:border-zinc-300 has-checked:border-blue-200 has-checked:bg-blue-50/60">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-blue-600"
            aria-invalid={Boolean(errors.demoAccepted)}
            {...register('demoAccepted')}
          />
          <span>
            Я понимаю, что это демо-магазин: товары и цены вымышлены, заказы никто не доставит, а оплата только
            имитируется. Разработчик не несёт ответственности
          </span>
        </label>
        {errors.demoAccepted && <p className="text-xs text-rose-600">{errors.demoAccepted.message}</p>}
      </div>
      <Button type="submit" size="lg" loading={isLoading} disabled={!demoAccepted}>
        Создать аккаунт
      </Button>
      <p className="-mt-2 text-center text-xs text-zinc-400">
        Не вводите настоящие данные карт и пароли от других сервисов
      </p>
      <p className="text-center text-sm text-zinc-500">
        Уже есть аккаунт?{' '}
        <Link href={loginHref} replace={inModal} className="font-medium text-blue-600 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
