import { io, type Socket } from 'socket.io-client';
import { refreshTokens } from '@/lib/api/refresh';
import type { OrderStatus } from '@/lib/order-status';
import type { ReviewStatus } from '@/lib/api/types';

// События, которые сервер присылает в namespace /shop
export interface ShopServerEvents {
  'catalog:changed': () => void; // всем, включая гостей
  'banners:changed': () => void; // всем
  'cart:changed': () => void; // только владельцу
  'favorites:changed': () => void;
  'order:created': (payload: { id: number }) => void; // владельцу и админам
  'order:updated': (payload: { id: number; status: OrderStatus }) => void;
  'warehouse:changed': () => void; // сборщикам и админам
  'delivery:changed': () => void; // курьерам и админам
  'reviews:changed': () => void; // админам: новый или изменённый отзыв ждёт модерации
  'review:moderated': (payload: { id: number; productId: number; status: ReviewStatus }) => void; // автору и админам
  'auth:expired': () => void;
}

export type ShopSocket = Socket<ShopServerEvents>;

// Один сокет на всё приложение. Подключаемся и гостем: каталог обновляется у всех
let socket: ShopSocket | null = null;
let lastForcedDisconnect = 0;

export function getSocket(): ShopSocket {
  if (socket) return socket;

  // withCredentials: браузер отправит httpOnly-куку shop_access_token, сервер проверит её при подключении
  // За прокси: namespace /shop на адресе сайта, а транспорт Socket.IO — по пути /api/socket.io (его проксирует Next).
  // addTrailingSlash: false — без слеша в конце: Next при проксировании его срезает
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const created: ShopSocket = apiUrl.startsWith('/') // API за прокси Next — относительный путь, а не http://…
    ? io('/shop', { path: `${apiUrl}/socket.io`, addTrailingSlash: false, withCredentials: true, autoConnect: false })
    : io(`${apiUrl}/shop`, { withCredentials: true, autoConnect: false });

  // Сервер сам разорвал соединение → access-токен истёк. Обновляем токены (тот же mutex, что и у baseQuery)
  // и переподключаемся. Не удалось — сервер очистил куки, и мы подключимся гостем
  created.on('disconnect', async (reason) => {
    if (reason !== 'io server disconnect') return;
    // Защита от цикла, если refresh «успешен», а сервер всё равно рвёт соединение
    if (Date.now() - lastForcedDisconnect < 5000) return;
    lastForcedDisconnect = Date.now();
    try {
      await refreshTokens();
    } catch {
      // сессия закончилась — дальше гостем
    }
    created.connect();
  });

  socket = created;
  return created;
}

// После входа или выхода куки другие — переподключаемся, чтобы сервер положил нас в нужные комнаты
export function reconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}
