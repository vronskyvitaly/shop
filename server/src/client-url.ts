// Адрес фронтенда (Next.js) для CORS: HTTP в setup-app.ts и WebSocket в ShopGateway.
// Читается напрямую из process.env, а не через ConfigService: декоратор @WebSocketGateway
// вычисляется при импорте файла, до того как ConfigModule загрузит .env
export const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3003';
