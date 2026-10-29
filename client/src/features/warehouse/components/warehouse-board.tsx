'use client';

import { Check, Inbox, PackageCheck, PackageOpen, Timer, Trophy, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import {
  BoardSection,
  PanelHeader,
  PanelSkeleton,
  RecentList,
  StatsRow,
  StatTile,
  StatTiles,
  StatTilesSkeleton,
  WeekChart,
} from '@/features/staff/components/staff-panel';
import { getErrorMessage } from '@/lib/api/errors';
import type { PickTask } from '@/lib/api/types';
import { formatDateTime, formatMinutes, itemsLabel, ordersLabel } from '@/lib/format';
import { showToast } from '@/lib/toast';
import {
  useCompletePickTaskMutation,
  useGetPickStatsQuery,
  useGetPickTasksQuery,
  useTakePickTaskMutation,
} from '../api';

// Рабочее место сборщика: свои цифры, задания в работе и очередь.
// Новые задания и статистика обновляются сами: сервер шлёт warehouse:changed (RealtimeSync)
export function WarehouseBoard() {
  const me = useRequireAuth(['PICKER', 'ADMIN']);
  const { data: tasks, isError, error } = useGetPickTasksQuery(undefined, { skip: !me });
  const { data: stats } = useGetPickStatsQuery(undefined, { skip: !me });

  if (!me || (!tasks && !isError)) return <PanelSkeleton />;
  if (isError) return <FormError message={getErrorMessage(error)} />;

  const inProgress = tasks!.filter((t) => t.status === 'IN_PROGRESS');
  const waiting = tasks!.filter((t) => t.status === 'NEW');
  const isAdmin = me.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        icon={<Warehouse />}
        title="Склад"
        subtitle={
          isAdmin
            ? 'Сборка заказов · цифры по всем сборщикам'
            : 'Возьмите заказ, соберите по списку и отметьте «Собрано»'
        }
      />

      {stats ? (
        <StatTiles>
          <StatTile
            tone="green"
            icon={<PackageCheck />}
            label="Собрано сегодня"
            value={stats.today.orders}
            hint={itemsLabel(stats.today.units)}
          />
          <StatTile
            tone="amber"
            icon={<Inbox />}
            label="Ждут сборки"
            value={stats.queue}
            hint={stats.inProgress ? `В работе: ${stats.inProgress}` : 'Сейчас никто не собирает'}
          />
          <StatTile
            tone="violet"
            icon={<Timer />}
            label="Среднее время сборки"
            value={stats.week.avgMinutes === null ? '—' : formatMinutes(stats.week.avgMinutes)}
            hint="за 7 дней"
          />
          <StatTile
            tone="blue"
            icon={<Trophy />}
            label="Собрано всего"
            value={stats.total}
            hint={`за 7 дней: ${stats.week.orders}`}
          />
        </StatTiles>
      ) : (
        <StatTilesSkeleton />
      )}

      <BoardSection
        title={isAdmin ? 'В работе' : 'Собираю'}
        count={inProgress.length}
        empty={{
          icon: <PackageOpen />,
          title: isAdmin ? 'Сейчас никто не собирает' : 'Вы ничего не собираете',
          text: isAdmin ? 'Задания в работе у сборщиков появятся здесь' : 'Возьмите заказ из очереди ниже',
        }}
      >
        {inProgress.map((task) => (
          <InProgressCard key={task.id} task={task} showPicker={isAdmin} />
        ))}
      </BoardSection>

      <BoardSection
        title="Ждут сборки"
        count={waiting.length}
        empty={{
          icon: <PackageCheck />,
          title: 'Все заказы разобраны',
          text: 'Новые подтверждённые заказы появятся здесь сами',
        }}
      >
        {waiting.map((task) => (
          <NewCard key={task.id} task={task} />
        ))}
      </BoardSection>

      {stats && (
        <StatsRow>
          <WeekChart
            title={isAdmin ? 'Собрано за неделю' : 'Мои сборки за неделю'}
            days={stats.days}
            summary={`${ordersLabel(stats.week.orders)} · ${itemsLabel(stats.week.units)}`}
          />
          <RecentList
            title="Недавно собраны"
            empty="За неделю сборок не было"
            items={stats.recent.map((task) => ({
              key: task.orderId,
              title: `Заказ №${task.orderId}`,
              subtitle: `${itemsLabel(task.units)} · ${formatDateTime(task.doneAt)}`,
              aside: task.minutes === null ? undefined : formatMinutes(task.minutes),
            }))}
          />
        </StatsRow>
      )}
    </div>
  );
}

function TaskHeader({ task, children }: { task: PickTask; children?: React.ReactNode }) {
  const units = task.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-lg font-bold">Заказ №{task.orderId}</p>
        <p className="text-xs text-zinc-500">
          {itemsLabel(units)} · с {formatDateTime(task.createdAt)}
        </p>
      </div>
      {children}
    </div>
  );
}

// Свободное задание: состав и кнопка «Взять»
function NewCard({ task }: { task: PickTask }) {
  const [take, { isLoading }] = useTakePickTaskMutation();
  return (
    <Card className="flex flex-col gap-3">
      <TaskHeader task={task} />
      <ul className="flex flex-col gap-1 text-sm">
        {task.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="line-clamp-1">{item.title}</span>
            <span className="shrink-0 font-semibold">× {item.quantity}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-auto"
        loading={isLoading}
        onClick={async () => {
          const { error } = await take(task.id);
          if (error) showToast({ title: 'Не получилось', description: getErrorMessage(error) });
        }}
      >
        <PackageOpen className="size-4" /> Взять в сборку
      </Button>
    </Card>
  );
}

// Задание в работе: чек-лист по позициям. «Собрано» — когда отмечено всё (отметки только в браузере)
function InProgressCard({ task, showPicker }: { task: PickTask; showPicker: boolean }) {
  const [complete, { isLoading }] = useCompletePickTaskMutation();
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const allChecked = task.items.every((item) => checked.has(item.id));

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="flex flex-col gap-3 ring-2 ring-blue-100">
      <TaskHeader task={task}>
        {showPicker && task.pickerName && <Badge className="bg-amber-50 text-amber-700">{task.pickerName}</Badge>}
      </TaskHeader>
      <ul className="flex flex-col gap-2">
        {task.items.map((item) => {
          const done = checked.has(item.id);
          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl p-2 ring-1 transition ${done ? 'bg-green-50 ring-green-200' : 'ring-zinc-200 hover:bg-zinc-50'}`}
              >
                <input type="checkbox" checked={done} onChange={() => toggle(item.id)} className="sr-only" />
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${done ? 'border-green-600 bg-green-600 text-white' : 'border-zinc-300'}`}
                >
                  {done && <Check className="size-4" />}
                </span>
                <ProductImage icon={item.icon} className="w-10 shrink-0" />
                <span className={`min-w-0 flex-1 text-sm ${done ? 'text-zinc-500 line-through' : ''}`}>
                  {item.title}
                </span>
                <span className="shrink-0 text-lg font-bold">× {item.quantity}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button
        className="mt-auto"
        disabled={!allChecked}
        loading={isLoading}
        onClick={async () => {
          const { error } = await complete(task.id);
          if (error) showToast({ title: 'Не получилось', description: getErrorMessage(error) });
          else showToast({ title: `Заказ №${task.orderId} собран`, description: 'Передан курьерам' });
        }}
      >
        <PackageCheck className="size-4" />{' '}
        {allChecked ? 'Собрано' : `Отметьте все позиции (${checked.size}/${task.items.length})`}
      </Button>
    </Card>
  );
}
