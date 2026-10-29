'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { BannerSlide } from '@/components/banner-slide';
import { IconGlyph, PRODUCT_ICONS } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { NativeSelect } from '@/components/ui/native-select';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { Banner } from '@/lib/api/types';
import { BANNER_COLORS, BANNER_THEMES, bannerGradient } from '@/lib/banner-themes';
import { formatDateTime } from '@/lib/format';
import { showToast } from '@/lib/toast';
import { bannerSchema, type BannerValues } from '@/lib/validation/shop.schemas';
import {
  useCreateBannerMutation,
  useDeleteBannerMutation,
  useGetAdminBannerQuery,
  useGetAdminBannersQuery,
  useReorderBannersMutation,
  useUpdateBannerMutation,
} from '../api';
import { AdminSkeleton } from './admin-shell';
import { IconButton } from './products-admin';

// ───────── Список ─────────

export function BannersAdmin() {
  const { data: banners, isError, error } = useGetAdminBannersQuery();
  const [updateBanner] = useUpdateBannerMutation();
  const [deleteBanner] = useDeleteBannerMutation();
  const [reorder, reorderState] = useReorderBannersMutation();
  // «Сейчас» для статуса «Запланирован / Завершён». Ленивый useState: Date.now() не вызывается на каждый рендер
  const [now] = useState(() => Date.now());

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!banners) return <AdminSkeleton />;

  const move = (from: number, to: number) => {
    const ids = banners.map((b) => b.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    void reorder(ids);
  };

  const onDelete = async (banner: Banner) => {
    if (!confirm(`Удалить баннер «${banner.title}»?`)) return;
    const { error } = await deleteBanner(banner.id);
    if (error) showToast({ title: 'Не удалось удалить', description: getErrorMessage(error) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Баннеры</h1>
          <p className="text-sm text-zinc-500">Карусель на главной. Порядок — стрелками</p>
        </div>
        <Link
          href="/admin/banners/new"
          className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="size-4" /> Добавить баннер
        </Link>
      </div>

      {banners.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">Баннеров нет — карусель на главной не показывается</Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-100">
            {banners.map((banner, i) => (
              <li key={banner.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex flex-col">
                  <IconButton label="Выше" onClick={() => i > 0 && !reorderState.isLoading && move(i, i - 1)}>
                    <ArrowUp className={`size-4 ${i === 0 ? 'opacity-30' : ''}`} />
                  </IconButton>
                  <IconButton
                    label="Ниже"
                    onClick={() => i < banners.length - 1 && !reorderState.isLoading && move(i, i + 1)}
                  >
                    <ArrowDown className={`size-4 ${i === banners.length - 1 ? 'opacity-30' : ''}`} />
                  </IconButton>
                </div>
                <span
                  className={`flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r text-white ${bannerGradient(banner.color)}`}
                >
                  <IconGlyph name={banner.icon} className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/banners/${banner.id}`} className="line-clamp-1 font-medium hover:text-blue-600">
                    {banner.title}
                  </Link>
                  <p className="truncate text-xs text-zinc-500">
                    {banner.link}
                    {(banner.startsAt || banner.endsAt) && ` · ${periodLabel(banner)}`}
                  </p>
                </div>
                <BannerStatus banner={banner} now={now} />
                <IconButton
                  label={banner.isActive ? 'Выключить' : 'Включить'}
                  onClick={() => updateBanner({ id: banner.id, body: { isActive: !banner.isActive } })}
                >
                  {banner.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconButton>
                <Link
                  href={`/admin/banners/${banner.id}`}
                  aria-label="Редактировать"
                  title="Редактировать"
                  className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  <Pencil className="size-4" />
                </Link>
                <IconButton label="Удалить" danger onClick={() => onDelete(banner)}>
                  <Trash className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function BannerStatus({ banner, now }: { banner: Banner; now: number }) {
  if (!banner.isActive) return <Badge className="bg-zinc-100 text-zinc-500">Выключен</Badge>;
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return <Badge className="bg-amber-50 text-amber-700">Запланирован</Badge>;
  }
  if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) {
    return <Badge className="bg-zinc-100 text-zinc-500">Завершён</Badge>;
  }
  return <Badge className="bg-green-50 text-green-700">Показывается</Badge>;
}

function periodLabel({ startsAt, endsAt }: Pick<Banner, 'startsAt' | 'endsAt'>) {
  if (startsAt && endsAt) return `${formatDateTime(startsAt)} — ${formatDateTime(endsAt)}`;
  if (startsAt) return `с ${formatDateTime(startsAt)}`;
  return `до ${formatDateTime(endsAt!)}`;
}

// ───────── Редактор (создание и изменение) ─────────

// ISO ↔ значение <input type="datetime-local"> в часовом поясе браузера
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export function BannerEditor({ id }: { id?: number }) {
  const { data: banner, isError, error } = useGetAdminBannerQuery(id!, { skip: !id });
  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (id && !banner) return <AdminSkeleton />;
  return <BannerForm banner={banner} />;
}

function BannerForm({ banner }: { banner?: Banner }) {
  const router = useRouter();
  const { data: categories } = useGetCategoriesQuery();
  const [createBanner, createState] = useCreateBannerMutation();
  const [updateBanner, updateState] = useUpdateBannerMutation();
  const state = banner ? updateState : createState;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BannerValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: banner?.title ?? '',
      subtitle: banner?.subtitle ?? '',
      buttonText: banner?.buttonText ?? 'Смотреть',
      link: banner?.link ?? '/',
      color: (banner?.color as BannerValues['color']) ?? 'blue',
      icon: (banner?.icon as BannerValues['icon']) ?? 'gift',
      isActive: banner?.isActive ?? true,
      startsAt: toLocalInput(banner?.startsAt ?? null),
      endsAt: toLocalInput(banner?.endsAt ?? null),
    },
  });
  // Живой предпросмотр: баннер перерисовывается при каждом изменении формы
  const preview = useWatch({ control });

  const onSubmit = async (values: BannerValues) => {
    const body = {
      ...values,
      subtitle: values.subtitle || null,
      buttonText: values.buttonText || null,
      startsAt: toIso(values.startsAt),
      endsAt: toIso(values.endsAt),
    };
    const result = banner ? await updateBanner({ id: banner.id, body }) : await createBanner(body);
    if (result.data) {
      showToast({ title: banner ? 'Баннер сохранён' : 'Баннер создан', description: result.data.title });
      router.push('/admin/banners');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{banner ? `Баннер #${banner.id}` : 'Новый баннер'}</h1>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">Предпросмотр</h2>
        <BannerSlide
          preview
          banner={{
            title: preview.title ?? '',
            subtitle: preview.subtitle || null,
            buttonText: preview.buttonText || null,
            link: preview.link ?? '/',
            color: preview.color ?? 'blue',
            icon: preview.icon ?? 'gift',
          }}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-4">
          <Field label="Заголовок" error={errors.title?.message} {...register('title')} />
          <Field
            label="Подзаголовок"
            placeholder="необязательно"
            error={errors.subtitle?.message}
            {...register('subtitle')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Текст кнопки"
              placeholder="пусто — без кнопки"
              error={errors.buttonText?.message}
              {...register('buttonText')}
            />
            <Field label="Ссылка" placeholder="/?categoryId=1" error={errors.link?.message} {...register('link')} />
          </div>
          {/* Подсказка: самая частая ссылка — на категорию */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Быстро: ссылка на категорию</span>
            <NativeSelect
              aria-label="Ссылка на категорию"
              value=""
              onChange={(event) => {
                if (event.target.value)
                  setValue('link', `/?categoryId=${event.target.value}`, { shouldValidate: true });
              }}
            >
              <option value="">— выберите категорию —</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Показывать с"
              type="datetime-local"
              error={errors.startsAt?.message}
              {...register('startsAt')}
            />
            <Field label="Показывать до" type="datetime-local" error={errors.endsAt?.message} {...register('endsAt')} />
          </div>
          <p className="-mt-2 text-xs text-zinc-500">Пустые даты — без ограничений. Время — ваше местное.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-blue-600" {...register('isActive')} />
            Показывать на главной
          </label>
        </Card>

        <Card className="flex flex-col gap-4 self-start">
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <h2 className="font-semibold">Цвет</h2>
                <div role="radiogroup" aria-label="Цвет" className="flex flex-wrap gap-2">
                  {BANNER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={field.value === color}
                      aria-label={BANNER_THEMES[color].label}
                      title={BANNER_THEMES[color].label}
                      onClick={() => field.onChange(color)}
                      className={`size-9 rounded-full bg-gradient-to-br ring-offset-2 ${BANNER_THEMES[color].gradient} ${field.value === color ? 'ring-2 ring-blue-600' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}
          />
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <h2 className="font-semibold">Иконка</h2>
                <p className="text-xs text-zinc-500">Пока вместо картинки. Фото появится вместе с хранилищем S3.</p>
                <div role="radiogroup" aria-label="Иконка" className="grid grid-cols-7 gap-1">
                  {PRODUCT_ICONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={field.value === name}
                      aria-label={name}
                      title={name}
                      onClick={() => field.onChange(name)}
                      className={`flex aspect-square items-center justify-center rounded-lg ${field.value === name ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                    >
                      <IconGlyph name={name} className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      <FormError message={state.isError ? getErrorMessage(state.error) : undefined} />
      <div className="flex gap-2">
        <Button type="submit" loading={state.isLoading}>
          {banner ? 'Сохранить' : 'Создать баннер'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/banners')}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
