'use client';

import {
  Heart,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  Truck,
  User,
  Warehouse,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconGlyph } from '@/components/product-icon';
import { useGetMeQuery, useLogoutMutation } from '@/features/auth/api';
import { useGetCartQuery, useGetFavoritesQuery } from '@/features/cart/api';
import { useGetCategoriesQuery } from '@/features/catalog/api';

export const STORE_NAME = 'Маркет';

export function Header() {
  const { data: me } = useGetMeQuery();
  // Корзину и избранное спрашиваем только у вошедшего: у гостя будет 401 → лишний refresh
  const { data: cart } = useGetCartQuery(undefined, { skip: !me });
  const { data: favorites } = useGetFavoritesQuery(undefined, { skip: !me });

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Телефон: строка 1 — логотип и иконки, строка 2 — каталог и поиск на всю ширину.
          С md всё в одну строку, как на десктопе */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:h-16 md:flex-nowrap md:py-0">
        <Link href="/" className="shrink-0 text-2xl font-black tracking-tight text-blue-600">
          {STORE_NAME}
        </Link>
        <div className="order-last flex w-full min-w-0 gap-2 md:order-none md:w-auto md:flex-1">
          <CatalogMenu />
          <SearchForm />
        </div>
        <nav className="ml-auto flex shrink-0 items-center">
          {me?.role === 'ADMIN' && (
            <NavIcon href="/admin" label="Админка" icon={<LayoutDashboard className="size-6" />} />
          )}
          {/* Сотрудникам — их рабочее место. Админ открывает доски из админки, чтобы не тесно было в шапке */}
          {me?.role === 'PICKER' && <NavIcon href="/warehouse" label="Склад" icon={<Warehouse className="size-6" />} />}
          {me?.role === 'COURIER' && <NavIcon href="/delivery" label="Доставка" icon={<Truck className="size-6" />} />}
          <NavIcon href="/orders" label="Заказы" icon={<Package className="size-6" />} />
          <NavIcon href="/favorites" label="Избранное" icon={<Heart className="size-6" />} count={favorites?.length} />
          <NavIcon href="/cart" label="Корзина" icon={<ShoppingCart className="size-6" />} count={cart?.count} />
          {/* Админ в магазине один — в шапке просто «Админ», имя не влезает и не нужно */}
          {me ? (
            <ProfileMenu name={me.role === 'ADMIN' ? 'Админ' : (me.name ?? me.email)} />
          ) : (
            <NavIcon href="/login" label="Войти" icon={<User className="size-6" />} />
          )}
        </nav>
      </div>
    </header>
  );
}

// Статичная шапка на время загрузки (Suspense в layout)
export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Та же высота, что у шапки: на телефоне — две строки, иначе страница прыгнет после загрузки */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 md:h-16 md:flex-nowrap md:py-0">
        <span className="flex h-[50px] items-center text-2xl font-black tracking-tight text-blue-600">
          {STORE_NAME}
        </span>
        <div className="h-11 w-full rounded-xl border-2 border-blue-600 md:hidden" />
      </div>
    </header>
  );
}

function NavIcon({ href, label, icon, count }: { href: string; label: string; icon: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex w-11 flex-col items-center gap-0.5 rounded-xl py-1 text-zinc-700 transition hover:text-blue-600 sm:w-16"
    >
      {icon}
      {/* На узком телефоне пять подписей не помещаются — только иконки (подпись остаётся в aria-label) */}
      <span className="hidden text-[11px] sm:inline">{label}</span>
      {Boolean(count) && (
        <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white sm:right-3">
          {count! > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

// Поиск: Enter → каталог с ?search=. Поле синхронизировано с URL (Назад/Вперёд)
function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [value, setValue] = useState(urlSearch);
  // Синхронизация с URL «во время рендера» — так React советует вместо setState в useEffect
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setValue(urlSearch);
  }

  return (
    <form
      role="search"
      // overflow-hidden: кнопка «Найти» обрезается по скруглению рамки, а не торчит квадратом
      className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-xl border-2 border-blue-600 bg-white"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        router.push(query ? `/?search=${encodeURIComponent(query)}` : '/');
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Искать на Маркете"
        aria-label="Поиск товаров"
        className="h-full min-w-0 flex-1 rounded-l-xl px-3 text-sm outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить"
          onClick={() => setValue('')}
          className="px-2 text-zinc-400 hover:text-zinc-600"
        >
          <X className="size-4" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Найти"
        className="flex h-full items-center bg-blue-600 px-4 text-white hover:bg-blue-700"
      >
        <Search className="size-5" />
      </button>
    </form>
  );
}

// Закрывает выпадающее меню по клику снаружи и по Esc
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

function CatalogMenu() {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { data: categories } = useGetCategoriesQuery();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label="Каталог"
        className="flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
      >
        {open ? <X className="size-5" /> : <LayoutGrid className="size-5" />}
        <span className="hidden sm:inline">Каталог</span>
      </button>
      {open && (
        <div className="absolute top-13 left-0 z-10 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-2 shadow-xl ring-1 ring-zinc-100">
          {categories?.map((category) => (
            <Link
              key={category.id}
              href={`/?categoryId=${category.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-zinc-100"
            >
              <IconGlyph name={category.icon} className="size-5 text-blue-600" />
              <span className="flex-1">{category.name}</span>
              <span className="text-xs text-zinc-400">{category.productsCount}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ name }: { name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const [logout, { isLoading }] = useLogoutMutation();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label="Профиль"
        className="flex w-11 flex-col items-center gap-0.5 rounded-xl py-1 text-zinc-700 hover:text-blue-600 sm:w-16"
      >
        <User className="size-6" />
        <span className="hidden max-w-16 truncate text-[11px] sm:inline">{name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="absolute top-14 right-0 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-zinc-100">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm hover:bg-zinc-100"
          >
            Профиль
          </Link>
          <Link
            href="/orders"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm hover:bg-zinc-100"
          >
            Мои заказы
          </Link>
          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setOpen(false);
              // Сначала уходим на главную: иначе защищённая страница (заказы, корзина) увидит выход
              // раньше и отправит на /login?next=…
              router.push('/');
              await logout();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" /> Выйти
          </button>
        </div>
      )}
    </div>
  );
}
