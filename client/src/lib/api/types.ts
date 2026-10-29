import type { DeliveryMethod, OrderStatus, PaymentMethod } from '@/lib/order-status';

// Типы ответов сервера (app-shop/server)

// PICKER — сборщик на складе (/warehouse), COURIER — курьер (/delivery)
export type Role = 'USER' | 'ADMIN' | 'PICKER' | 'COURIER';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface CategoryWithCount extends Category {
  productsCount: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  brand: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  icon: string;
  isActive: boolean;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  categoryId: number;
  category: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export type ProductSort = 'popular' | 'price_asc' | 'price_desc' | 'new' | 'rating';

export interface ProductsQuery {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

// Опубликованный отзыв на витрине (одобренная модератором версия)
export interface Review {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  edited: boolean; // автор менял отзыв после публикации
  user: { name: string | null };
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Свой отзыв: последняя версия автора, статус модерации и то, что сейчас опубликовано
export interface OwnReview {
  id: number;
  productId: number;
  rating: number;
  text: string;
  status: ReviewStatus;
  publishedRating: number | null;
  publishedText: string | null;
  moderatorComment: string | null; // причина отклонения
  createdAt: string;
  updatedAt: string;
}

// Отзыв в очереди модерации
export interface AdminReview extends OwnReview {
  user: { id: number; email: string; name: string | null };
  product: { id: number; title: string; icon: string };
}

export interface CartLine {
  productId: number;
  quantity: number;
  available: boolean;
  product: Pick<Product, 'id' | 'title' | 'brand' | 'price' | 'oldPrice' | 'icon' | 'stock' | 'isActive'>;
}

export interface Cart {
  items: CartLine[];
  count: number;
  itemsTotal: number;
  oldItemsTotal: number;
  hasUnavailable: boolean;
}

export interface OrderItem {
  id: number;
  productId: number | null;
  title: string;
  icon: string;
  price: number;
  quantity: number;
}

// Задание на сборку (модуль склада): состав заказа скопирован в задание
export interface PickTask {
  id: number;
  orderId: number;
  status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  pickerId: number | null;
  pickerName: string | null;
  items: { id: number; title: string; icon: string; quantity: number }[];
  createdAt: string;
  startedAt: string | null;
}

// Задание на доставку (модуль доставки): адрес и получатель скопированы в задание
export interface DeliveryTask {
  id: number;
  orderId: number;
  status: 'WAITING' | 'READY' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  courierId: number | null;
  courierName: string | null;
  deliveryMethod: DeliveryMethod;
  address: string;
  recipientName: string;
  phone: string;
  comment: string | null;
  itemsCount: number;
  total: number;
  cashToCollect: number;
  createdAt: string;
  takenAt: string | null;
}

// Статистика сотрудника склада/доставки (админ получает общие цифры). days — 7 дней, последний — сегодня
export interface StaffDay {
  date: string; // 2026-10-13
  count: number;
}

export interface PickStats {
  today: { orders: number; units: number };
  week: { orders: number; units: number; avgMinutes: number | null };
  total: number;
  queue: number;
  inProgress: number;
  days: StaffDay[];
  recent: { orderId: number; units: number; minutes: number | null; doneAt: string }[];
}

export interface DeliveryStats {
  today: { orders: number; cash: number };
  week: { orders: number; cash: number; avgMinutes: number | null };
  total: number;
  ready: number;
  waiting: number;
  inTransit: number;
  days: StaffDay[];
  recent: { orderId: number; address: string; cash: number; minutes: number | null; deliveredAt: string }[];
}

// Сохранённый адрес доставки покупателя
export interface Address {
  id: number;
  label: string | null;
  recipientName: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export type AddressBody = Pick<Address, 'label' | 'recipientName' | 'phone' | 'address'>;

// Баннер в карусели на главной
export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  buttonText: string | null;
  link: string;
  color: string;
  icon: string;
  isActive: boolean;
  position: number;
  startsAt: string | null;
  endsAt: string | null;
}

export type BannerBody = Omit<Banner, 'id' | 'position'>;

// Фильтр по остатку в админке: low — заканчивается (1…5 шт.), out — нет в наличии
export type StockFilter = 'low' | 'out';

// Шаблон ответа администратора (причина отмены, комментарий к статусу)
export interface ReplyTemplate {
  id: number;
  title: string;
  text: string;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  itemsTotal: number;
  deliveryPrice: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  recipientName: string;
  phone: string;
  address: string;
  comment: string | null;
  items: OrderItem[];
  history?: { id: number; status: OrderStatus; comment: string | null; createdAt: string }[];
  user?: { id: number; email: string; name: string | null };
  createdAt: string;
  updatedAt: string;
}
