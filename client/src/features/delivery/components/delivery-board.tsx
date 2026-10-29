'use client';

import {
  Banknote,
  CircleCheck,
  MapPin,
  MessageSquare,
  Navigation,
  PackageCheck,
  Phone,
  Timer,
  Truck,
} from 'lucide-react';
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
import type { DeliveryTask } from '@/lib/api/types';
import { formatDateTime, formatMinutes, formatPrice, itemsLabel, ordersLabel } from '@/lib/format';
import { DELIVERY_LABELS } from '@/lib/order-status';
import { showToast } from '@/lib/toast';
import {
  useCompleteDeliveryTaskMutation,
  useGetDeliveryStatsQuery,
  useGetDeliveryTasksQuery,
  useTakeDeliveryTaskMutation,
} from '../api';

// Рабочее место курьера: свои цифры, заказы в пути и готовые к выдаче.
// Доска и статистика обновляются сами по delivery:changed (RealtimeSync)
export function DeliveryBoard() {
  const me = useRequireAuth(['COURIER', 'ADMIN']);
  const { data: tasks, isError, error } = useGetDeliveryTasksQuery(undefined, { skip: !me });
  const { data: stats } = useGetDeliveryStatsQuery(undefined, { skip: !me });

  if (!me || (!tasks && !isError)) return <PanelSkeleton />;
  if (isError) return <FormError message={getErrorMessage(error)} />;

  const inTransit = tasks!.filter((t) => t.status === 'IN_TRANSIT');
  const ready = tasks!.filter((t) => t.status === 'READY');
  const isAdmin = me.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        icon={<Truck />}
        title="Доставка"
        subtitle={
          isAdmin
            ? 'Заказы в пути · цифры по всем курьерам'
            : 'Заберите собранный заказ на складе и отметьте, когда вручите'
        }
      />

      {stats ? (
        <StatTiles>
          <StatTile
            tone="green"
            icon={<CircleCheck />}
            label="Доставлено сегодня"
            value={stats.today.orders}
            hint={`за 7 дней: ${stats.week.orders}`}
          />
          <StatTile
            tone="amber"
            icon={<PackageCheck />}
            label="Готовы к выдаче"
            value={stats.ready}
            hint={stats.waiting ? `Ещё ${stats.waiting} на сборке` : 'На складе ничего не собирается'}
          />
          <StatTile
            tone="violet"
            icon={<Banknote />}
            label="Наличные сегодня"
            value={formatPrice(stats.today.cash)}
            hint={isAdmin ? 'получено курьерами' : 'сдать в кассу'}
          />
          <StatTile
            tone="blue"
            icon={<Timer />}
            label="Среднее время в пути"
            value={stats.week.avgMinutes === null ? '—' : formatMinutes(stats.week.avgMinutes)}
            hint="за 7 дней"
          />
        </StatTiles>
      ) : (
        <StatTilesSkeleton />
      )}

      <BoardSection
        title={isAdmin ? 'В пути' : 'Везу'}
        count={inTransit.length}
        empty={{
          icon: <Navigation />,
          title: isAdmin ? 'Сейчас никто не везёт заказы' : 'Вы сейчас ничего не везёте',
          text: isAdmin ? 'Заказы, которые забрали курьеры, появятся здесь' : 'Заберите заказ из списка ниже',
        }}
      >
        {inTransit.map((task) => (
          <TaskCard key={task.id} task={task} showCourier={isAdmin} />
        ))}
      </BoardSection>

      <BoardSection
        title="Готовы к выдаче"
        count={ready.length}
        empty={{
          icon: <Truck />,
          title: 'Пока нечего везти',
          text: stats?.waiting
            ? `На складе собирают ${ordersLabel(stats.waiting)} — появятся здесь сами`
            : 'Собранные на складе заказы появятся здесь сами',
        }}
      >
        {ready.map((task) => (
          <TaskCard key={task.id} task={task} showCourier={false} />
        ))}
      </BoardSection>

      {stats && (
        <StatsRow>
          <WeekChart
            title={isAdmin ? 'Доставлено за неделю' : 'Мои доставки за неделю'}
            days={stats.days}
            summary={`${ordersLabel(stats.week.orders)} · всего ${stats.total}`}
          />
          <RecentList
            title="Недавно доставлены"
            empty="За неделю доставок не было"
            items={stats.recent.map((task) => ({
              key: task.orderId,
              title: `Заказ №${task.orderId}`,
              subtitle: `${formatDateTime(task.deliveredAt)} · ${task.address}`,
              aside:
                task.cash > 0
                  ? formatPrice(task.cash)
                  : task.minutes === null
                    ? undefined
                    : formatMinutes(task.minutes),
            }))}
          />
        </StatsRow>
      )}
    </div>
  );
}

function TaskCard({ task, showCourier }: { task: DeliveryTask; showCourier: boolean }) {
  const [take, takeState] = useTakeDeliveryTaskMutation();
  const [complete, completeState] = useCompleteDeliveryTaskMutation();
  const inTransit = task.status === 'IN_TRANSIT';

  const run = async (action: Promise<{ error?: unknown }>, success?: string) => {
    const { error } = await action;
    if (error) showToast({ title: 'Не получилось', description: getErrorMessage(error as never) });
    else if (success) showToast({ title: success });
  };

  return (
    <Card className={`flex flex-col gap-3 ${inTransit ? 'ring-2 ring-blue-100' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">Заказ №{task.orderId}</p>
          <p className="text-xs text-zinc-500">
            {DELIVERY_LABELS[task.deliveryMethod]} · {itemsLabel(task.itemsCount)}
          </p>
        </div>
        {showCourier && task.courierName && <Badge className="bg-sky-50 text-sky-700">{task.courierName}</Badge>}
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex gap-2">
          <MapPin className="size-4 shrink-0 text-blue-600" />
          <span>{task.address}</span>
        </li>
        <li className="flex gap-2">
          <Phone className="size-4 shrink-0 text-blue-600" />
          <span>
            {task.recipientName}, {/* tel: — на телефоне курьера номер набирается одним касанием */}
            <a href={`tel:${task.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:underline">
              {task.phone}
            </a>
          </span>
        </li>
        {task.comment && (
          <li className="flex gap-2 text-zinc-600">
            <MessageSquare className="size-4 shrink-0 text-blue-600" />
            <span className="whitespace-pre-line">{task.comment}</span>
          </li>
        )}
        <li
          className={`flex items-center gap-2 rounded-xl px-3 py-2 font-medium ${task.cashToCollect > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}
        >
          <Banknote className="size-4 shrink-0" />
          {task.cashToCollect > 0 ? `Получить с покупателя ${formatPrice(task.cashToCollect)}` : 'Оплачен онлайн'}
        </li>
      </ul>

      {inTransit ? (
        <Button
          className="mt-auto"
          loading={completeState.isLoading}
          onClick={() => run(complete(task.id), `Заказ №${task.orderId} вручён`)}
        >
          <CircleCheck className="size-4" /> Вручено
        </Button>
      ) : (
        <Button className="mt-auto" loading={takeState.isLoading} onClick={() => run(take(task.id))}>
          <Truck className="size-4" /> Забрать заказ
        </Button>
      )}
    </Card>
  );
}
