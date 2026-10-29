'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Pagination } from '@/components/ui/pagination';
import { useGetMeQuery } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { Role } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/roles';
import { showToast } from '@/lib/toast';
import { useGetAdminUsersQuery, useUpdateUserRoleMutation } from '../api';
import { AdminSkeleton } from './admin-shell';

// Администратор один — назначить можно только эти роли (сервер проверяет так же)
const ASSIGNABLE_ROLES: Role[] = ['USER', 'PICKER', 'COURIER'];

export function UsersAdmin() {
  const { data: me } = useGetMeQuery();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, isError, error } = useGetAdminUsersQuery({ page, search: query || undefined });
  const [updateRole, roleState] = useUpdateUserRoleMutation();

  const changeRole = async (id: number, email: string, role: Role) => {
    if (!confirm(`Назначить ${email} роль «${ROLE_LABELS[role]}»?`)) return;
    const result = await updateRole({ id, role });
    if (result.error) showToast({ title: 'Не удалось изменить роль', description: getErrorMessage(result.error) });
    // Роль лежит в access-токене, поэтому у пользователя она изменится не сразу, а после refresh (до 15 минут)
    else
      showToast({ title: 'Роль изменена', description: 'Вступит в силу при следующем обновлении сессии пользователя' });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Пользователи {data && <span className="text-zinc-400">{data.total}</span>}</h1>
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
          placeholder="Поиск по email"
          aria-label="Поиск по email"
          className="h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        />
        <Button type="submit" variant="outline" aria-label="Найти">
          <Search className="size-4" />
        </Button>
      </form>

      {isError && <FormError message={getErrorMessage(error)} />}
      {!data ? (
        <AdminSkeleton />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3 text-right">Заказов</th>
                <th className="px-4 py-3">Зарегистрирован</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.items.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-zinc-400">{user.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {/* Админа (и себя) не меняем — просто бейдж. Остальным роль выбирается прямо в бейдже */}
                    {user.role === 'ADMIN' || user.id === me?.id ? (
                      <Badge className={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    ) : (
                      <RoleSelect
                        label={`Роль ${user.email}`}
                        role={user.role}
                        disabled={roleState.isLoading}
                        onChange={(role) => changeRole(user.id, user.email, role)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{user.ordersCount}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(user.createdAt)}</td>
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

// Нативный select, оформленный как цветной бейдж роли: по клику — системный список (на телефоне — нативный пикер)
function RoleSelect({
  label,
  role,
  disabled,
  onChange,
}: {
  label: string;
  role: Role;
  disabled: boolean;
  onChange: (role: Role) => void;
}) {
  return (
    <span
      className={`relative inline-flex items-center rounded-lg transition hover:brightness-95 ${ROLE_COLORS[role]}`}
    >
      <select
        aria-label={label}
        value={role}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Role)}
        className="h-7 cursor-pointer appearance-none rounded-lg bg-transparent py-0 pr-7 pl-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 disabled:cursor-wait"
      >
        {ASSIGNABLE_ROLES.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-3.5" />
    </span>
  );
}
