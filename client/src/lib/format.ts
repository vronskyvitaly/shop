const priceFormat = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// 32990 → «32 990 ₽»
export const formatPrice = (rubles: number) => priceFormat.format(rubles);
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

// Скидка в процентах, если есть старая цена
export function discountPercent(price: number, oldPrice: number | null | undefined): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}

// 45 → «45 мин», 125 → «2 ч 5 мин»
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '< 1 мин';
  if (minutes < 60) return `${minutes} мин`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} ч ${rest} мин` : `${minutes / 60} ч`;
}

// «3 товара»
export const itemsLabel = (n: number) => `${n} ${plural(n, ['товар', 'товара', 'товаров'])}`;
export const ordersLabel = (n: number) => `${n} ${plural(n, ['заказ', 'заказа', 'заказов'])}`;

// plural(5, ['товар', 'товара', 'товаров']) → «товаров»
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
