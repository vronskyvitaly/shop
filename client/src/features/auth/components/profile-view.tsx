'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, Heart, LayoutDashboard, LogOut, Package, ShieldCheck, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressesCard } from '@/features/addresses/components/addresses-card';
import { useGetCartQuery, useGetFavoritesQuery } from '@/features/cart/api';
import { useGetMyOrdersQuery } from '@/features/orders/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { User } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { showToast } from '@/lib/toast';
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '@/lib/validation/auth.schemas';
import { useChangePasswordMutation, useLogoutMutation, useUpdateProfileMutation } from '../api';
import { useRequireAuth } from '../use-require-auth';

export function ProfileView() {
  const me = useRequireAuth();
  if (!me) return <ProfileSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <ProfileCard me={me} />
        <QuickLinks isAdmin={me.role === 'ADMIN'} />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Профиль</h1>
        {/* key: после сохранения форма начинает с новых данных */}
        <ProfileForm key={me.name} me={me} />
        <AddressesCard defaultRecipient={me.name ?? ''} />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProfileCard({ me }: { me: User }) {
  const router = useRouter();
  const [logout, { isLoading }] = useLogoutMutation();
  const name = me.name ?? me.email;

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      {/* Аватар-заглушка: первая буква имени. Фото появится вместе с S3 */}
      <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-3xl font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </span>
      <div>
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-sm text-zinc-500">{me.email}</p>
      </div>
      {me.role === 'ADMIN' && (
        <Badge className="bg-violet-50 text-violet-700">
          <ShieldCheck className="mr-1 size-3.5" /> Администратор
        </Badge>
      )}
      <p className="text-xs text-zinc-400">С нами с {formatDate(me.createdAt)}</p>
      <Button
        variant="ghost"
        className="w-full text-rose-600 hover:bg-rose-50"
        loading={isLoading}
        onClick={async () => {
          router.push('/'); // сначала уходим: защищённая страница иначе отправит на /login
          await logout();
        }}
      >
        <LogOut className="size-4" /> Выйти
      </Button>
    </Card>
  );
}

function QuickLinks({ isAdmin }: { isAdmin: boolean }) {
  const { data: orders } = useGetMyOrdersQuery({ page: 1 });
  const { data: favorites } = useGetFavoritesQuery();
  const { data: cart } = useGetCartQuery();

  return (
    <Card className="flex flex-col p-2">
      <QuickLink href="/orders" icon={<Package />} label="Мои заказы" count={orders?.total} />
      <QuickLink href="/favorites" icon={<Heart />} label="Избранное" count={favorites?.length} />
      <QuickLink href="/cart" icon={<ShoppingCart />} label="Корзина" count={cart?.count} />
      {isAdmin && <QuickLink href="/admin" icon={<LayoutDashboard />} label="Админ-панель" />}
    </Card>
  );
}

function QuickLink({ href, icon, label, count }: { href: string; icon: ReactNode; label: string; count?: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-zinc-50">
      <span className="text-blue-600 [&>svg]:size-5">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {count !== undefined && <span className="text-zinc-400">{count}</span>}
      <ChevronRight className="size-4 text-zinc-300" />
    </Link>
  );
}

function ProfileForm({ me }: { me: User }) {
  const [updateProfile, { isLoading, isError, error }] = useUpdateProfileMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: me.name ?? '' } });

  return (
    <Card>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (values) => {
          const result = await updateProfile(values);
          if (!result.error) showToast({ title: 'Профиль сохранён' });
        })}
      >
        <h2 className="text-lg font-semibold">Личные данные</h2>
        <FormError message={isError ? getErrorMessage(error) : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" autoComplete="name" error={errors.name?.message} {...register('name')} />
          {/* Email — это логин: его смена потребует подтверждения почты, пока только показываем */}
          <Field label="Email" value={me.email} disabled readOnly className="bg-zinc-50 text-zinc-500" />
        </div>
        <Button type="submit" loading={isLoading} disabled={!isDirty} className="self-start">
          Сохранить
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [changePassword, { isLoading, isError, error }] = useChangePasswordMutation();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  return (
    <Card>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async ({ currentPassword, newPassword }) => {
          setDone(false);
          const result = await changePassword({ currentPassword, newPassword });
          if (!result.error) {
            reset();
            setDone(true);
          }
        })}
      >
        <div>
          <h2 className="text-lg font-semibold">Смена пароля</h2>
          <p className="text-sm text-zinc-500">После смены выйдем со всех остальных устройств</p>
        </div>
        <FormError message={isError ? getErrorMessage(error) : undefined} />
        {done && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">Пароль изменён</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Текущий пароль"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Field
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Field
            label="Повторите новый"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <Button type="submit" variant="outline" loading={isLoading} className="self-start">
          Изменить пароль
        </Button>
      </form>
    </Card>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Skeleton className="h-80 rounded-2xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
