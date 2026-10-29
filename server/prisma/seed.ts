import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ───────── Главный администратор ─────────
// Данные — из .env (ADMIN_EMAIL, ADMIN_PASSWORD), чтобы пароль не лежал в коде и в git.
// Если пользователь уже есть, только выдаём ему роль ADMIN: пароль, который он мог сменить, не трогаем
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('Задайте ADMIN_EMAIL и ADMIN_PASSWORD в .env');

await prisma.user.upsert({
  where: { email: adminEmail },
  create: { email: adminEmail, name: 'Администратор', password: await hash(adminPassword, 10), role: 'ADMIN' },
  update: { role: 'ADMIN' },
});

// ───────── Демо-аккаунты — только если задан DEMO_PASSWORD (локально; на проде не задаём) ─────────
// Покупатель, сборщик (/warehouse) и курьер (/delivery). Только создаём — пароль, если сменили, не трогаем
const demoPassword = process.env.DEMO_PASSWORD;
if (demoPassword) {
  for (const [email, name, role] of [
    ['demo@example.com', 'Демо Покупатель', 'USER'],
    ['picker@example.com', 'Демо Сборщик', 'PICKER'],
    ['courier@example.com', 'Демо Курьер', 'COURIER'],
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      create: { email, name, password: await hash(demoPassword, 10), role },
      update: {},
    });
  }
}

// ───────── Каталог — только в пустую базу ─────────
if ((await prisma.product.count()) === 0) {
  type SeedProduct = [title: string, brand: string, price: number, oldPrice: number | null, stock: number, icon: string];

  const catalog: Record<string, { icon: string; products: SeedProduct[] }> = {
    Смартфоны: {
      icon: 'smartphone',
      products: [
        ['Смартфон Galaxy A55 8/256 ГБ', 'Samsung', 32990, 39990, 25, 'smartphone'],
        ['Смартфон iPhone 15 128 ГБ', 'Apple', 74990, 89990, 12, 'smartphone'],
        ['Смартфон Redmi Note 13 Pro 8/256 ГБ', 'Xiaomi', 24490, 29990, 40, 'smartphone'],
        ['Смартфон Pixel 8a 8/128 ГБ', 'Google', 41990, null, 4, 'smartphone'],
      ],
    },
    'Ноутбуки и компьютеры': {
      icon: 'laptop',
      products: [
        ['Ноутбук MacBook Air 13 M3 16/512 ГБ', 'Apple', 139990, 159990, 6, 'laptop'],
        ['Ноутбук IdeaPad Slim 5 16" Ryzen 7', 'Lenovo', 79990, 92990, 10, 'laptop'],
        ['Клавиатура механическая K8 Pro', 'Keychron', 11990, null, 18, 'keyboard'],
        ['Мышь беспроводная MX Master 3S', 'Logitech', 9490, 10990, 30, 'mouse'],
        ['Планшет iPad 10.9 64 ГБ Wi-Fi', 'Apple', 39990, 44990, 8, 'tablet'],
        ['МФУ лазерное LaserJet M141w', 'HP', 15490, null, 3, 'printer'],
      ],
    },
    'Аудио и ТВ': {
      icon: 'headphones',
      products: [
        ['Наушники беспроводные WH-1000XM5', 'Sony', 29990, 36990, 15, 'headphones'],
        ['Наушники AirPods Pro 2', 'Apple', 22990, 26990, 22, 'headphones'],
        ['Телевизор 55" QLED 4K Smart TV', 'TCL', 42990, 54990, 7, 'tv'],
        ['Портативная колонка Charge 5', 'JBL', 13990, 16990, 20, 'speaker'],
      ],
    },
    'Фото и гаджеты': {
      icon: 'camera',
      products: [
        ['Фотоаппарат беззеркальный Alpha 6400 kit', 'Sony', 89990, 99990, 2, 'camera'],
        ['Смарт-часы Watch 6 Classic 47 мм', 'Samsung', 27990, 34990, 11, 'watch'],
        ['Игровая консоль PlayStation 5 Slim', 'Sony', 54990, 59990, 5, 'gamepad'],
      ],
    },
    Одежда: {
      icon: 'shirt',
      products: [
        ['Футболка оверсайз хлопок, чёрная', 'Befree', 1290, 1990, 120, 'shirt'],
        ['Худи утеплённое унисекс', 'Gloria Jeans', 2990, 3990, 60, 'shirt'],
        ['Солнцезащитные очки авиаторы', 'Ray-Ban', 12990, 15490, 9, 'glasses'],
        ['Рюкзак городской 25 л', 'Xiaomi', 2490, 2990, 45, 'backpack'],
      ],
    },
    Обувь: {
      icon: 'footprints',
      products: [
        ['Кроссовки беговые Pegasus 41', 'Nike', 11990, 14990, 14, 'footprints'],
        ['Кеды классические Chuck Taylor', 'Converse', 7490, null, 26, 'footprints'],
      ],
    },
    'Дом и кухня': {
      icon: 'sofa',
      products: [
        ['Диван-кровать угловой «Атланта»', 'Hoff', 39990, 52990, 3, 'sofa'],
        ['Настольная лампа LED с диммером', 'Xiaomi', 2290, 2790, 35, 'lamp'],
        ['Кастрюля 5 л нержавеющая сталь', 'Tefal', 3490, 4590, 28, 'cooking-pot'],
        ['Холодильник двухкамерный No Frost', 'Haier', 49990, 57990, 4, 'refrigerator'],
        ['Стиральная машина 7 кг, 1200 об/мин', 'LG', 36990, 42990, 6, 'washing-machine'],
        ['Кофемашина автоматическая EP2221', 'Philips', 34990, 44990, 8, 'coffee'],
      ],
    },
    'Красота и здоровье': {
      icon: 'sparkles',
      products: [
        ['Набор уходовой косметики для лица', 'La Roche-Posay', 3990, 4990, 50, 'sparkles'],
        ['Витамин D3 2000 МЕ, 120 капсул', 'Solgar', 1490, null, 80, 'pill'],
        ['Парфюмерная вода 50 мл', 'Lacoste', 6990, 8490, 17, 'gem'],
      ],
    },
    'Спорт и отдых': {
      icon: 'dumbbell',
      products: [
        ['Гантели разборные 2×10 кг', 'Torneo', 4990, 5990, 12, 'dumbbell'],
        ['Велосипед горный 27.5" 21 скорость', 'Stern', 24990, 29990, 5, 'bike'],
        ['Автомобильный видеорегистратор 4K', '70mai', 8990, 11990, 19, 'car'],
      ],
    },
    'Детям, книги, хобби': {
      icon: 'puzzle',
      products: [
        ['Конструктор Technic «Гоночный автомобиль»', 'LEGO', 8990, 10990, 13, 'puzzle'],
        ['Коляска прогулочная лёгкая', 'Happy Baby', 12990, 15990, 4, 'baby'],
        ['Книга «Чистый код»', 'Питер', 1190, 1490, 64, 'book'],
        ['Корм для кошек сухой 10 кг', 'Purina Pro Plan', 6490, 7290, 21, 'paw-print'],
        ['Подарочный набор чая и сладостей', 'Greenfield', 1890, null, 33, 'gift'],
        ['Набор инструментов 108 предметов', 'Bosch', 7990, 9490, 10, 'wrench'],
      ],
    },
  };

  for (const [name, { icon, products }] of Object.entries(catalog)) {
    await prisma.category.create({
      data: {
        name,
        icon,
        products: {
          create: products.map(([title, brand, price, oldPrice, stock, productIcon], index) => ({
            title,
            brand,
            description: `${title} от ${brand}. Оригинальный товар с гарантией производителя. Доставка курьером или в пункт выдачи.`,
            price,
            oldPrice,
            stock,
            icon: productIcon,
            searchText: `${title} ${brand}`.toLowerCase(),
            // Разная «популярность», чтобы сортировка по популярности что-то показывала
            salesCount: (products.length - index) * 7 + stock,
          })),
        },
      },
    });
  }
}

// Стартовые шаблоны ответов администратора. Только в пустую таблицу: свои шаблоны админ правит в админке
if ((await prisma.replyTemplate.count()) === 0) {
  await prisma.replyTemplate.createMany({
    data: [
      {
        title: 'Нет на складе',
        text: 'К сожалению, товара не оказалось на складе. Приносим извинения — деньги вернутся в течение 3 рабочих дней.',
      },
      {
        title: 'Не дозвонились',
        text: 'Не удалось связаться с вами для подтверждения заказа. Оформите, пожалуйста, заказ заново.',
      },
      { title: 'По просьбе покупателя', text: 'Заказ отменён по вашей просьбе.' },
      { title: 'Брак при сборке', text: 'При сборке обнаружен брак товара. Приносим извинения — оформите заказ повторно.' },
      { title: 'Адрес вне зоны доставки', text: 'К сожалению, мы не доставляем по указанному адресу. Выберите пункт выдачи.' },
    ],
  });
}

// Стартовые баннеры для карусели на главной. Ссылки — по названию категории: id зависят от базы
if ((await prisma.banner.count()) === 0) {
  const categoryLink = async (name: string) => {
    const category = await prisma.category.findUnique({ where: { name } });
    return category ? `/?categoryId=${category.id}` : '/';
  };
  await prisma.banner.createMany({
    data: [
      {
        title: 'Скидки до 30% на электронику и дом',
        subtitle: 'Бесплатная доставка курьером от 1 500 ₽ и в пункты выдачи — всегда',
        buttonText: 'Смотреть',
        link: '/?sort=price_asc',
        color: 'blue',
        icon: 'sparkles',
        position: 0,
      },
      {
        title: 'Новые смартфоны уже в продаже',
        subtitle: 'Флагманы и бюджетные модели с официальной гарантией',
        buttonText: 'К смартфонам',
        link: await categoryLink('Смартфоны'),
        color: 'violet',
        icon: 'smartphone',
        position: 1,
      },
      {
        title: 'Всё для спорта',
        subtitle: 'Тренируйтесь дома и на улице',
        buttonText: 'Выбрать',
        link: await categoryLink('Спорт и отдых'),
        color: 'emerald',
        icon: 'dumbbell',
        position: 2,
      },
    ],
  });
}

await prisma.$disconnect();
