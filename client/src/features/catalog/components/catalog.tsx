'use client';

import { SearchX } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { IconGlyph } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { NativeSelect } from '@/components/ui/native-select';
import { Pagination } from '@/components/ui/pagination';
import { getErrorMessage } from '@/lib/api/errors';
import type { CategoryWithCount, ProductSort, ProductsQuery } from '@/lib/api/types';
import { plural } from '@/lib/format';
import { useGetCategoriesQuery, useGetProductsQuery } from '../api';
import { BannerCarousel } from './banner-carousel';
import { ProductCard, ProductGridSkeleton } from './product-card';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'popular', label: 'Популярные' },
  { value: 'new', label: 'Новинки' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
  { value: 'rating', label: 'С высоким рейтингом' },
];

const toNumber = (value: string | null) => (value && Number.isFinite(Number(value)) ? Number(value) : undefined);

// Каталог: все фильтры в URL — ссылкой можно поделиться, «Назад» возвращает прошлые фильтры
export function Catalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query: ProductsQuery = {
    search: searchParams.get('search') || undefined,
    categoryId: toNumber(searchParams.get('categoryId')),
    minPrice: toNumber(searchParams.get('minPrice')),
    maxPrice: toNumber(searchParams.get('maxPrice')),
    sort: (searchParams.get('sort') as ProductSort | null) ?? undefined,
    page: toNumber(searchParams.get('page')) ?? 1,
    limit: 20,
  };
  const { data, isFetching, isError, error } = useGetProductsQuery(query);
  const { data: categories } = useGetCategoriesQuery();

  // Меняем часть параметров; любой новый фильтр сбрасывает страницу на первую
  const update = (changes: Partial<Record<keyof ProductsQuery, string | number | undefined>>) => {
    const params = new URLSearchParams(searchParams);
    if (!('page' in changes)) params.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/', { scroll: 'page' in changes });
  };

  const category = categories?.find((c) => c.id === query.categoryId);
  const isHome = !query.search && !query.categoryId;
  const title = query.search ? `Результаты по запросу «${query.search}»` : (category?.name ?? 'Популярные товары');

  return (
    <div className="flex flex-col gap-6">
      {isHome && (
        <>
          <BannerCarousel />
          <HomeCategories categories={categories} onSelect={(id) => update({ categoryId: id })} />
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Filters key={`${query.minPrice}-${query.maxPrice}`} categories={categories} query={query} onChange={update} />

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {data && (
                <p className="text-sm text-zinc-500">
                  {data.total} {plural(data.total, ['товар', 'товара', 'товаров'])}
                </p>
              )}
            </div>
            <NativeSelect
              aria-label="Сортировка"
              value={query.sort ?? 'popular'}
              onChange={(event) => update({ sort: event.target.value === 'popular' ? undefined : event.target.value })}
              className="w-56"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          {isError ? (
            <FormError message={getErrorMessage(error)} />
          ) : !data ? (
            <ProductGridSkeleton />
          ) : data.items.length === 0 ? (
            <EmptyState icon={<SearchX className="size-16" />} title="Ничего не нашлось">
              <p className="text-sm text-zinc-500">Попробуйте изменить запрос или сбросить фильтры</p>
              <Button variant="secondary" onClick={() => router.push('/')}>
                Сбросить фильтры
              </Button>
            </EmptyState>
          ) : (
            // Полупрозрачность, пока грузится следующая страница: старые данные остаются на экране
            <div
              className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}
            >
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {data && <Pagination page={data.page} pages={data.pages} onChange={(page) => update({ page })} />}
        </section>
      </div>
    </div>
  );
}

// Плитки категорий под баннерами
function HomeCategories({
  categories,
  onSelect,
}: {
  categories?: CategoryWithCount[];
  onSelect: (id: number) => void;
}) {
  if (!categories) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-sm shadow-sm transition hover:shadow-md"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <IconGlyph name={category.icon} className="size-6" />
          </span>
          {category.name}
        </button>
      ))}
    </div>
  );
}

function Filters({
  categories,
  query,
  onChange,
}: {
  categories?: CategoryWithCount[];
  query: ProductsQuery;
  onChange: (changes: Partial<Record<keyof ProductsQuery, string | number | undefined>>) => void;
}) {
  // Цена применяется по кнопке, а не на каждое нажатие клавиши (иначе запрос на каждую цифру)
  const [minPrice, setMinPrice] = useState(query.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(query.maxPrice?.toString() ?? '');

  return (
    <aside className="flex flex-col gap-4 self-start rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="mb-2 font-semibold">Категории</h2>
        <ul className="flex flex-col gap-0.5 text-sm">
          <li>
            <button
              type="button"
              onClick={() => onChange({ categoryId: undefined })}
              className={`w-full rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100 ${!query.categoryId ? 'font-semibold text-blue-600' : ''}`}
            >
              Все товары
            </button>
          </li>
          {categories?.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onChange({ categoryId: category.id })}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100 ${query.categoryId === category.id ? 'font-semibold text-blue-600' : ''}`}
              >
                {category.name}
                <span className="text-xs text-zinc-400">{category.productsCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined });
        }}
      >
        <h2 className="font-semibold">Цена, ₽</h2>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="от"
            aria-label="Цена от"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            className="h-10 w-full min-w-0 rounded-xl border border-zinc-300 px-3 text-sm"
          />
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="до"
            aria-label="Цена до"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            className="h-10 w-full min-w-0 rounded-xl border border-zinc-300 px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Применить
        </Button>
      </form>
    </aside>
  );
}
