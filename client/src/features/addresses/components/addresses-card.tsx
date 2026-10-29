'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Pencil, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errors';
import type { Address, AddressBody } from '@/lib/api/types';
import { showToast } from '@/lib/toast';
import { addressSchema, type AddressValues } from '@/lib/validation/shop.schemas';
import {
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useGetAddressesQuery,
  useMakeDefaultAddressMutation,
  useUpdateAddressMutation,
} from '../api';

const MAX_ADDRESSES = 10; // как на сервере

// Профиль → «Адреса доставки»: добавить, изменить, удалить, выбрать основной (подставляется при оформлении)
export function AddressesCard({ defaultRecipient }: { defaultRecipient: string }) {
  const { data: addresses, isError, error } = useGetAddressesQuery();
  // null — ничего не редактируем, 'new' — форма нового адреса, число — id редактируемого
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [createAddress, createState] = useCreateAddressMutation();
  const [updateAddress, updateState] = useUpdateAddressMutation();
  const [makeDefault, defaultState] = useMakeDefaultAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();

  const onDelete = async (address: Address) => {
    if (!confirm(`Удалить адрес «${address.label ?? address.address}»?`)) return;
    const { error } = await deleteAddress(address.id);
    if (error) showToast({ title: 'Не удалось удалить', description: getErrorMessage(error) });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Адреса доставки</h2>
          <p className="text-sm text-zinc-500">Основной адрес подставится при оформлении заказа</p>
        </div>
        {addresses && addresses.length < MAX_ADDRESSES && editing !== 'new' && (
          <Button variant="secondary" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Добавить
          </Button>
        )}
      </div>

      {isError && <FormError message={getErrorMessage(error)} />}
      {!addresses && !isError && <Skeleton className="h-20 rounded-xl" />}

      {editing === 'new' && (
        <AddressForm
          defaults={{ label: '', recipientName: defaultRecipient, phone: '', address: '' }}
          submitLabel="Сохранить адрес"
          loading={createState.isLoading}
          error={createState.isError ? getErrorMessage(createState.error) : undefined}
          onCancel={() => setEditing(null)}
          onSubmit={async (body) => {
            const ok = !(await createAddress(body)).error;
            if (ok) setEditing(null);
          }}
        />
      )}

      {addresses?.length === 0 && editing !== 'new' && (
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          Сохранённых адресов нет. Добавьте адрес здесь или при оформлении заказа
        </p>
      )}

      {addresses && addresses.length > 0 && (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) =>
            editing === address.id ? (
              <li key={address.id}>
                <AddressForm
                  defaults={{ ...address, label: address.label ?? '' }}
                  submitLabel="Сохранить"
                  loading={updateState.isLoading}
                  error={updateState.isError ? getErrorMessage(updateState.error) : undefined}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (body) => {
                    const ok = !(await updateAddress({ id: address.id, body })).error;
                    if (ok) setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={address.id} className="flex items-start gap-3 rounded-xl p-4 ring-1 ring-zinc-200">
                <MapPin className="mt-0.5 size-5 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {address.label ?? 'Адрес'}
                    {address.isDefault && <Badge className="bg-blue-50 text-blue-700">Основной</Badge>}
                  </p>
                  <p className="text-sm">{address.address}</p>
                  <p className="text-sm text-zinc-500">
                    {address.recipientName}, {address.phone}
                  </p>
                  {!address.isDefault && (
                    <button
                      type="button"
                      disabled={defaultState.isLoading}
                      onClick={() => makeDefault(address.id)}
                      className="mt-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Сделать основным
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Изменить адрес"
                  title="Изменить"
                  onClick={() => setEditing(address.id)}
                  className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Удалить адрес"
                  title="Удалить"
                  onClick={() => onDelete(address)}
                  className="flex size-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                >
                  <Trash className="size-4" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function AddressForm({
  defaults,
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  defaults: AddressValues;
  submitLabel: string;
  loading: boolean;
  error?: string;
  onSubmit: (body: AddressBody) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: defaults });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit({ ...values, label: values.label || null }))}
      className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-4"
    >
      <FormError message={error} />
      <Field
        label="Адрес"
        placeholder="Город, улица, дом, квартира"
        autoComplete="street-address"
        error={errors.address?.message}
        {...register('address')}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field
          label="Получатель"
          autoComplete="name"
          error={errors.recipientName?.message}
          {...register('recipientName')}
        />
        <Field
          label="Телефон"
          type="tel"
          autoComplete="tel"
          placeholder="+7 999 123-45-67"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Field label="Название" placeholder="Дом, Работа…" error={errors.label?.message} {...register('label')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
