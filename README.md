# Маркет — интернет-магазин

`server/` — NestJS 12 + Prisma (PostgreSQL) + REST + Socket.IO, порт **4500** (Swagger: http://localhost:4500/docs)
`client/` — Next.js 16 + RTK Query + Tailwind, порт **3003**

## Запуск

```bash
# сервер
cd server
npm ci
createdb shop && createdb shop_test   # локальный PostgreSQL: рабочая и тестовая базы
cp .env.example .env        # указать DATABASE_URL / TEST_DATABASE_URL, JWT-секреты и ADMIN_EMAIL / ADMIN_PASSWORD
npx prisma migrate dev      # применяет миграции и запускает сид
npm run start:dev

# клиент (в другом терминале)
cd client
npm ci
npm run dev
```

Сид создаёт администратора из `ADMIN_EMAIL` / `ADMIN_PASSWORD`, 10 категорий, 41 товар, 3 баннера
и 5 шаблонов ответов. Если задан `DEMO_PASSWORD` (только локально), ещё демо-покупателя `demo@example.com`,
сборщика `picker@example.com` и курьера `courier@example.com` с этим паролем.
Повторный `npm run db:seed` только выдаёт администратору роль `ADMIN`, пароли не перезаписывает.

Клиент ходит на сервер через прокси Next: `/api/*` → `http://localhost:4500/*` (rewrites в `next.config.ts`),
сокет — по пути `/api/socket.io`. Поэтому браузер видит один адрес, и куки работают без CORS.
Оба адреса задаются в `client/.env` (не в git; скопировать из `client/.env.example`): `NEXT_PUBLIC_API_URL=/api`, `API_PROXY_TARGET=http://localhost:4500`.
Без них клиент не запустится и напишет, какой переменной не хватает.

### Показать сайт в интернете (пока запущен компьютер)

Запустить оба сервера и открыть наружу **только порт 3003**: VS Code → Ports → Forward Port → 3003 →
Port Visibility → Public. Или `cloudflared tunnel --url http://localhost:3003`, или `ngrok http 3003`.
Порт 4500 открывать не нужно. Адреса туннелей разрешены в `allowedDevOrigins` (`next.config.ts`).

Тесты сервера: `npm run test:e2e` (отдельная база из `TEST_DATABASE_URL`, очищается перед запуском).

На проде сервер подключается к PostgreSQL в Coolify: `DATABASE_URL` задаётся в переменных окружения Coolify,
миграции — `npx prisma migrate deploy`.

## Архитектура

```
app-shop/
├── server/                 NestJS 12 (ESM) — REST API + Socket.IO, порт 4500
│   ├── prisma/             schema.prisma, миграции, seed.ts
│   ├── src/
│   │   ├── auth, users     вход, JWT в httpOnly-куках, роли
│   │   ├── catalog         товары и категории
│   │   ├── cart, favorites, addresses, reviews, banners, reply-templates
│   │   ├── orders          оформление и статусы заказов
│   │   ├── warehouse       сборка заказов (своя таблица PickTask)
│   │   ├── delivery        доставка (своя таблица DeliveryTask)
│   │   ├── events          контракт событий между модулями
│   │   ├── realtime        Socket.IO-шлюз, namespace /shop
│   │   ├── admin           статистика и управление пользователями
│   │   └── prisma, common  PrismaService, фильтр ошибок Prisma, пагинация, утилиты
│   └── test/               e2e-тесты (Vitest + supertest)
└── client/                 Next.js 16 (App Router) — порт 3003
    └── src/
        ├── app/            страницы: каталог, корзина, заказы, профиль, /admin, /warehouse, /delivery
        ├── features/       домены: API-слайсы RTK Query + компоненты
        ├── components/     общие UI-компоненты
        └── lib/            store, api, socket, валидация (zod), утилиты
```

- **Клиент ↔ сервер:** браузер обращается только к Next; `/api/*` проксируется на NestJS (`next.config.ts`),
  сокет — по пути `/api/socket.io`. Один адрес — куки работают без CORS.
- **Данные:** PostgreSQL через Prisma. Локально — своя база, на проде — база в Coolify.
- **Авторизация:** access-токен (15 мин) и refresh-токен (7 дней, ротация) в httpOnly-куках, роль в access-токене,
  права проверяет `RolesGuard`. Роли: покупатель, администратор, сборщик, курьер.
- **Модули склада и доставки** не вызывают сервис заказов напрямую — общаются событиями `@nestjs/event-emitter`:
  ```
  orders ──order.status.changed (CONFIRMED)──▶ warehouse, delivery
  warehouse ──warehouse.pick.started / pick.completed──▶ orders, delivery
  delivery ──delivery.started / delivery.completed──▶ orders
  ```
  Чтобы вынести модуль в отдельный сервис, достаточно заменить шину событий на брокер (RabbitMQ, NATS).
- **Реальное время:** изменения заказов, каталога, корзины и избранного рассылаются клиентам через Socket.IO.
