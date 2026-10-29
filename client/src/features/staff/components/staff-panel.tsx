'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StaffDay } from '@/lib/api/types';

// Общие блоки рабочих мест сотрудников (склад, доставка): шапка, плитки с цифрами,
// график за неделю, последние выполненные заказы, секции доски

// Цвета плиток. Классы целиком — Tailwind находит только полные имена
const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
} as const;

const todayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

// «2026-10-13» → дата в местном времени (new Date('2026-10-13') дал бы полночь по UTC)
const parseDay = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function PanelHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm [&>svg]:size-6">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {/* На телефоне — отдельной строкой под заголовком, чтобы не сжимать его */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm sm:w-auto sm:flex-col sm:items-end">
        <span className="font-medium first-letter:uppercase">{todayFormat.format(new Date())}</span>
        {/* Доска обновляется сама по событиям сокета — показываем, что она «живая» */}
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-green-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
          Обновляется автоматически
        </span>
      </div>
    </div>
  );
}

export function StatTiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function StatTile({
  icon,
  label,
  value,
  hint,
  tone = 'blue',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5 ${TONES[tone]}`}>
          {icon}
        </span>
        <span className="text-sm leading-tight text-zinc-500">{label}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold">{value}</p>
        {hint && <p className="truncate text-xs text-zinc-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function StatTilesSkeleton() {
  return (
    <StatTiles>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </StatTiles>
  );
}

// Столбики по дням за неделю, сегодняшний выделен
export function WeekChart({ title, days, summary }: { title: string; days: StaffDay[]; summary: string }) {
  const max = Math.max(...days.map((day) => day.count), 1);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-zinc-500">{summary}</span>
      </div>
      <div className="flex h-40 items-end gap-2">
        {days.map((day, index) => {
          const isToday = index === days.length - 1;
          const date = parseDay(day.date);
          return (
            <div
              key={day.date}
              className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
              title={`${dayFormat.format(date)}: ${day.count}`}
            >
              <div className="flex w-full flex-1 flex-col items-center justify-end gap-1">
                <span className={`text-xs font-semibold ${day.count ? '' : 'text-zinc-300'}`}>{day.count}</span>
                <div
                  className={`w-full max-w-10 rounded-t-lg transition-all ${isToday ? 'bg-blue-600' : 'bg-blue-200'}`}
                  style={{ height: day.count ? `${Math.max(8, (day.count / max) * 80)}%` : '4px' }}
                />
              </div>
              <span className={`text-xs ${isToday ? 'font-semibold text-blue-600' : 'text-zinc-500'}`}>
                {isToday ? 'сег.' : weekdayFormat.format(date)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export type RecentItem = { key: number; title: string; subtitle: string; aside?: ReactNode };

export function RecentList({ title, items, empty }: { title: string; items: RecentItem[]; empty: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>
              </div>
              {item.aside && <span className="shrink-0 text-sm font-semibold">{item.aside}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Секция доски: заголовок со счётчиком и сетка карточек. Пустая — компактная пунктирная заглушка
export function BoardSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: { icon: ReactNode; title: string; text: string };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <span
          className={`rounded-full px-2 py-0.5 text-sm font-semibold ${count ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}
        >
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-zinc-200 px-5 py-6">
          <span className="text-zinc-300 [&>svg]:size-10">{empty.icon}</span>
          <div>
            <p className="font-medium">{empty.title}</p>
            <p className="text-sm text-zinc-500">{empty.text}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

// Неделя и последние заказы — рядом на широком экране
export function StatsRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">{children}</div>;
}

export function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-12 w-72" />
      <StatTilesSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
