# Next.js-клиент магазина (output: 'standalone'), порт 3003

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --include=dev: tailwind, typescript и плагины сборки — devDependencies, а NODE_ENV может прийти production
RUN npm ci --include=dev

FROM node:24-slim AS build
WORKDIR /app
# Нужны на этапе сборки: адрес прокси /api/* попадает в rewrites, NEXT_PUBLIC_* — в бандл браузера
ARG API_PROXY_TARGET
ARG NEXT_PUBLIC_API_URL=/api
ENV API_PROXY_TARGET=$API_PROXY_TARGET \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ может быть пустой и тогда не попадает в git
RUN mkdir -p public && npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3003 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3003
CMD ["node", "server.js"]
