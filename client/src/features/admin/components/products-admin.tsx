'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Pencil, Plus, Search, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { IconGlyph, PRODUCT_ICONS, ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { Field, Select, TextArea } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Pagination } from '@/components/ui/pagination';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { Product, StockFilter } from '@/lib/api/types';
import { formatPrice } from '@/lib/format';
import { showToast } from '@/lib/toast';
import { productSchema, type ProductFormInput, type ProductFormValues } from '@/lib/validation/shop.schemas';
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetAdminProductQuery,
  useGetAdminProductsQuery,
  useUpdateProductMutation,
} from '../api';
import { AdminSkeleton } from './admin-shell';

// Фильтр по остатку. Порог «заканчивается» тот же, что на сервере (LOW_STOCK) и в карточке товара
const STOCK_FILTERS: { value?: StockFilter; label: string }[] = [
  { label: 'Все' },
  { value: 'low', label: 'Заканчиваются (≤ 5 шт.)' },
  { value: 'out', label: 'Нет в наличии' },
];

export function ProductsAdmin() {
  const router = useRouter();
  // Фильтр — в URL: на него ссылается дашборд («Заканчиваются на складе»)
  const searchParams = useSearchParams();
  const stockParam = searchParams.get('stock');
  const stock = stockParam === 'low' || stockParam === 'out' ? stockParam : undefined;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, isError, error, isFetching } = useGetAdminProductsQuery({
    page,
    search: query || undefined,
    stock,
    sort: 'new',
    limit: 20,
  });
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const onDelete = async (product: Product) => {
    if (!confirm(`Удалить «${product.title}»? Из корзин и избранного он пропадёт, в старых заказах останется.`)) return;
    const { error } = await deleteProduct(product.id);
    if (error) showToast({ title: 'Не удалось удалить', description: getErrorMessage(error) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Товары {data && <span className="text-zinc-400">{data.total}</span>}</h1>
        <Link
          href="/admin/products/new"
          className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="size-4" /> Добавить товар
        </Link>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию или бренду"
          aria-label="Поиск товаров"
          className="h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        />
        <Button type="submit" variant="outline" aria-label="Найти">
          <Search className="size-4" />
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {STOCK_FILTERS.map((filter) => (
          <button
            key={filter.value ?? 'all'}
            type="button"
            aria-pressed={stock === filter.value}
            onClick={() => {
              setPage(1);
              router.replace(filter.value ? `/admin/products?stock=${filter.value}` : '/admin/products');
            }}
            className={`rounded-xl px-3 py-1.5 text-sm ${stock === filter.value ? 'bg-blue-600 text-white' : 'bg-white hover:bg-zinc-50'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isError && <FormError message={getErrorMessage(error)} />}
      {!data ? (
        <AdminSkeleton />
      ) : data.items.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">
          {stock === 'low'
            ? 'Заканчивающихся товаров нет'
            : stock === 'out'
              ? 'Все товары в наличии'
              : 'Товаров не найдено'}
        </Card>
      ) : (
        <Card className={`overflow-x-auto p-0 ${isFetching ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3 text-right">Цена</th>
                <th className="px-4 py-3 text-right">Остаток</th>
                <th className="px-4 py-3 text-right">Продано</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.items.map((product) => (
                <tr key={product.id} className={product.isActive ? '' : 'bg-zinc-50 text-zinc-400'}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <ProductImage icon={product.icon} className="w-10 shrink-0" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="line-clamp-1 font-medium hover:text-blue-600"
                        >
                          {product.title}
                        </Link>
                        <span className="text-xs text-zinc-400">
                          #{product.id} {product.brand && `· ${product.brand}`}
                        </span>
                        {!product.isActive && <Badge className="ml-2 bg-zinc-200 text-zinc-600">скрыт</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">{product.category.name}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {formatPrice(product.price)}
                    {product.oldPrice && (
                      <div className="text-xs text-zinc-400 line-through">{formatPrice(product.oldPrice)}</div>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2 text-right ${product.stock === 0 ? 'font-semibold text-rose-600' : product.stock <= 5 ? 'text-amber-600' : ''}`}
                  >
                    {product.stock}
                  </td>
                  <td className="px-4 py-2 text-right">{product.salesCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton
                        label={product.isActive ? 'Скрыть с витрины' : 'Показать на витрине'}
                        onClick={() => updateProduct({ id: product.id, body: { isActive: !product.isActive } })}
                      >
                        {product.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </IconButton>
                      <Link
                        href={`/admin/products/${product.id}`}
                        aria-label="Редактировать"
                        title="Редактировать"
                        className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <IconButton label="Удалить" onClick={() => onDelete(product)} danger>
                        <Trash className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-lg ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-zinc-500 hover:bg-zinc-100'}`}
    >
      {children}
    </button>
  );
}

// ───────── Форма товара (создание и редактирование) ─────────

export function ProductEditor({ id }: { id?: number }) {
  const { data: product, isError, error } = useGetAdminProductQuery(id!, { skip: !id });
  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (id && !product) return <AdminSkeleton />;
  return <ProductForm product={product} />;
}

function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { data: categories } = useGetCategoriesQuery();
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();
  const state = product ? updateState : createState;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title ?? '',
      description: product?.description ?? '',
      brand: product?.brand ?? '',
      price: product?.price ?? '',
      oldPrice: product?.oldPrice ?? '',
      stock: product?.stock ?? 0,
      icon: (product?.icon as ProductFormInput['icon']) ?? 'package',
      categoryId: product?.categoryId ?? '',
      isActive: product?.isActive ?? true,
    },
  });
  const icon = useWatch({ control, name: 'icon' });

  const onSubmit = async (values: ProductFormValues) => {
    const body = { ...values, brand: values.brand || null, oldPrice: values.oldPrice === '' ? null : values.oldPrice };
    const result = product ? await updateProduct({ id: product.id, body }) : await createProduct(body);
    if (result.data) {
      showToast({ title: product ? 'Товар сохранён' : 'Товар создан', description: result.data.title });
      router.push('/admin/products');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{product ? `Товар #${product.id}` : 'Новый товар'}</h1>
        {product && (
          <Link href={`/product/${product.id}`} className="text-sm text-blue-600 hover:underline">
            Открыть на витрине
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex flex-col gap-4">
          <Field label="Название" error={errors.title?.message} {...register('title')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Бренд" error={errors.brand?.message} {...register('brand')} />
            <Select label="Категория" error={errors.categoryId?.message} {...register('categoryId')}>
              <option value="">— выберите —</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <TextArea label="Описание" rows={6} error={errors.description?.message} {...register('description')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Цена, ₽"
              type="number"
              inputMode="numeric"
              error={errors.price?.message}
              {...register('price')}
            />
            <Field
              label="Старая цена, ₽"
              type="number"
              inputMode="numeric"
              placeholder="без скидки"
              error={errors.oldPrice?.message}
              {...register('oldPrice')}
            />
            <Field
              label="Остаток, шт."
              type="number"
              inputMode="numeric"
              error={errors.stock?.message}
              {...register('stock')}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-blue-600" {...register('isActive')} />
            Показывать на витрине
          </label>
        </Card>

        <Card className="flex flex-col gap-3 self-start">
          <h2 className="font-semibold">Изображение</h2>
          <ProductImage icon={icon} iconClassName="size-1/3" />
          <p className="text-xs text-zinc-500">
            Пока вместо фото — иконка. Загрузка фото появится вместе с хранилищем S3.
          </p>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Иконка" className="grid grid-cols-6 gap-1">
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
                    <IconGlyph name={name} />
                  </button>
                ))}
              </div>
            )}
          />
        </Card>
      </div>

      <FormError message={state.isError ? getErrorMessage(state.error) : undefined} />
      <div className="flex gap-2">
        <Button type="submit" loading={state.isLoading}>
          {product ? 'Сохранить' : 'Создать товар'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
