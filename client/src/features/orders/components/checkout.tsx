'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, CreditCard, MapPin, Plus, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, TextArea } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { useCreateAddressMutation, useGetAddressesQuery } from '@/features/addresses/api';
import { useRequireAuth } from '@/features/auth/use-require-auth';
import { useGetCartQuery } from '@/features/cart/api';
import { CartSkeleton } from '@/features/cart/components/cart-view';
import { getErrorMessage } from '@/lib/api/errors';
import type { Address, Cart } from '@/lib/api/types';
import { formatPrice, itemsLabel } from '@/lib/format';
import { deliveryPrice } from '@/lib/order-status';
import { checkoutSchema, type CheckoutValues } from '@/lib/validation/shop.schemas';
import { useCreateOrderMutation } from '../api';

const MAX_ADDRESSES = 10; // как на сервере

export function Checkout() {
  const me = useRequireAuth();
  const { data: cart } = useGetCartQuery(undefined, { skip: !me });
  const { data: addresses, isError: addressesFailed } = useGetAddressesQuery(undefined, { skip: !me });
  // Адреса не загрузились — не блокируем заказ, просто без сохранённых
  if (!cart || !me || (!addresses && !addressesFailed)) return <CartSkeleton />;
  // Форма создаётся, когда всё загружено: в неё подставляются основной адрес или имя пользователя
  return <CheckoutForm cart={cart} userName={me.name ?? ''} addresses={addresses ?? []} />;
}

function CheckoutForm({ cart, userName, addresses }: { cart: Cart; userName: string; addresses: Address[] }) {
  const router = useRouter();
  const [createOrder, { isLoading, isError, error, isSuccess }] = useCreateOrderMutation();
  const [createAddress] = useCreateAddressMutation();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  // Выбранный сохранённый адрес или 'new' — ввести новый
  const [selected, setSelected] = useState<number | 'new'>(defaultAddress?.id ?? 'new');
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState('');
  const canSave = addresses.length < MAX_ADDRESSES;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipientName: defaultAddress?.recipientName ?? userName,
      phone: defaultAddress?.phone ?? '',
      address: defaultAddress?.address ?? '',
      deliveryMethod: 'COURIER',
      paymentMethod: 'CARD_ONLINE',
      comment: '',
    },
  });
  const deliveryMethod = useWatch({ control, name: 'deliveryMethod' });

  // Сохранённый адрес просто заполняет поля формы: в заказ уходит копия, как при ручном вводе
  const pick = (address: Address | 'new') => {
    clearErrors(['recipientName', 'phone', 'address']);
    if (address === 'new') {
      setSelected('new');
      setValue('address', ''); // получателя и телефон оставляем — обычно это тот же человек
      return;
    }
    setSelected(address.id);
    setValue('recipientName', address.recipientName);
    setValue('phone', address.phone);
    setValue('address', address.address);
  };

  // Пустая корзина (открыли /checkout напрямую) — назад в корзину. После успешного заказа корзина
  // тоже пустеет, но тогда мы уже уходим на страницу заказа
  const empty = cart.items.length === 0;
  useEffect(() => {
    if (empty && !isSuccess) router.replace('/cart');
  }, [empty, isSuccess, router]);

  const delivery = deliveryPrice(deliveryMethod, cart.itemsTotal);
  const onSubmit = async (values: CheckoutValues) => {
    const result = await createOrder(values);
    if (!result.data) return;
    // Новый адрес сохраняем только после успешного заказа: при ошибке (товар закончился) не плодим дубли.
    // Не дожидаемся ответа — заказ уже оформлен, а адрес можно добавить и в профиле
    if (selected === 'new' && saveAddress && canSave) {
      const { recipientName, phone, address } = values;
      void createAddress({ label: addressLabel.trim() || null, recipientName, phone, address });
    }
    router.replace(`/orders/${result.data.id}?created=1`);
  };
  const isNew = selected === 'new';
  const addressErrors = errors.address ?? errors.phone ?? errors.recipientName;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Оформление заказа</h1>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Способ получения</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              register={register('deliveryMethod')}
              value="COURIER"
              icon={<Truck className="size-5" />}
              title="Курьером"
              hint="Бесплатно от 1 500 ₽, иначе 199 ₽"
            />
            <Choice
              register={register('deliveryMethod')}
              value="PICKUP"
              icon={<MapPin className="size-5" />}
              title="В пункт выдачи"
              hint="Бесплатно"
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            {deliveryMethod === 'PICKUP' ? 'Пункт выдачи и получатель' : 'Адрес и получатель'}
          </h2>

          {addresses.length > 0 && (
            <div role="radiogroup" aria-label="Сохранённые адреса" className="grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <AddressChoice key={address.id} checked={selected === address.id} onSelect={() => pick(address)}>
                  <span className="flex items-center gap-2 font-medium">
                    {address.label ?? 'Адрес'}
                    {address.isDefault && <span className="text-xs font-normal text-zinc-400">основной</span>}
                  </span>
                  <span className="text-sm">{address.address}</span>
                  <span className="text-xs text-zinc-500">
                    {address.recipientName}, {address.phone}
                  </span>
                </AddressChoice>
              ))}
              <AddressChoice checked={isNew} onSelect={() => pick('new')}>
                <span className="flex items-center gap-2 font-medium text-blue-600">
                  <Plus className="size-4" /> Новый адрес
                </span>
                <span className="text-xs text-zinc-500">Ввести другой адрес и получателя</span>
              </AddressChoice>
            </div>
          )}

          {/* Сохранённый адрес не прошёл проверку (например, сменились правила) — поля скрыты, подсказываем */}
          {!isNew && addressErrors && (
            <FormError message="В выбранном адресе ошибка — выберите «Новый адрес» или исправьте его в профиле" />
          )}

          {isNew && (
            <div className="flex flex-col gap-3">
              <Field
                label={deliveryMethod === 'PICKUP' ? 'Адрес пункта выдачи' : 'Адрес доставки'}
                placeholder="Город, улица, дом, квартира"
                autoComplete="street-address"
                error={errors.address?.message}
                {...register('address')}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Имя и фамилия"
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
              </div>
              {canSave && (
                <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-3 sm:flex-row sm:items-center">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(event) => setSaveAddress(event.target.checked)}
                      className="size-4 accent-blue-600"
                    />
                    Сохранить адрес в профиле
                  </label>
                  {saveAddress && (
                    <input
                      value={addressLabel}
                      onChange={(event) => setAddressLabel(event.target.value)}
                      placeholder="Название: Дом, Работа…"
                      aria-label="Название адреса"
                      maxLength={30}
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm sm:w-56"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <TextArea
            label="Комментарий курьеру (необязательно)"
            error={errors.comment?.message}
            {...register('comment')}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Оплата</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              register={register('paymentMethod')}
              value="CARD_ONLINE"
              icon={<CreditCard className="size-5" />}
              title="Картой онлайн"
              hint="Сейчас — имитация оплаты"
            />
            <Choice
              register={register('paymentMethod')}
              value="CASH_ON_DELIVERY"
              icon={<Banknote className="size-5" />}
              title="При получении"
              hint="Картой или наличными"
            />
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 self-start lg:sticky lg:top-24">
        <FormError message={isError ? getErrorMessage(error) : undefined} />
        <Button type="submit" size="lg" className="w-full" loading={isLoading} disabled={cart.hasUnavailable}>
          Оформить заказ
        </Button>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ваш заказ</h2>
          <Link href="/cart" className="text-sm text-blue-600 hover:underline">
            Изменить
          </Link>
        </div>
        {/* Состав заказа: название, количество и сумма по каждому товару. Длинный список прокручивается внутри */}
        <ul className="-mx-1 flex max-h-80 flex-col divide-y divide-zinc-100 overflow-y-auto px-1">
          {cart.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 py-2.5">
              <ProductImage icon={item.product.icon} className="w-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug">{item.product.title}</p>
                <p className="text-xs text-zinc-500">
                  {item.quantity} × {formatPrice(item.product.price)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Товары, {itemsLabel(cart.count)}</dt>
            <dd>{formatPrice(cart.itemsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Доставка</dt>
            <dd className={delivery === 0 ? 'text-green-600' : ''}>
              {delivery === 0 ? 'Бесплатно' : formatPrice(delivery)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-2 text-lg font-bold">
            <dt>Итого</dt>
            <dd>{formatPrice(cart.itemsTotal + delivery)}</dd>
          </div>
        </dl>
      </Card>
    </form>
  );
}

// Карточка сохранённого адреса. Не через register: выбор адреса — не поле заказа, а заполнение полей
function AddressChoice({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-0.5 rounded-xl p-4 ring-1 ring-zinc-200 transition has-checked:bg-blue-50 has-checked:ring-2 has-checked:ring-blue-600">
      <input type="radio" name="savedAddress" checked={checked} onChange={onSelect} className="sr-only" />
      {children}
    </label>
  );
}

// Карточка-переключатель для radio (способ доставки, оплаты)
function Choice({
  register,
  value,
  icon,
  title,
  hint,
}: {
  register: UseFormRegisterReturn;
  value: string;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 ring-zinc-200 transition has-checked:bg-blue-50 has-checked:ring-2 has-checked:ring-blue-600">
      <input type="radio" value={value} className="sr-only" {...register} />
      <span className="text-blue-600">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </span>
    </label>
  );
}
