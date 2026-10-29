import { z } from 'zod';
import { PRODUCT_ICONS } from '@/components/product-icon';
import { BANNER_COLORS } from '@/lib/banner-themes';

// Правила совпадают с DTO на сервере, чтобы ошибки показывались сразу в форме

// Получатель — общий для заказа и сохранённого адреса
const recipient = {
  recipientName: z.string().trim().min(1, 'Укажите получателя').max(100, 'Не больше 100 символов'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{10,20}$/, 'Введите корректный телефон'),
  address: z.string().trim().min(1, 'Укажите адрес').max(300, 'Не больше 300 символов'),
};

export const addressSchema = z.object({
  label: z.string().trim().max(30, 'Не больше 30 символов'),
  ...recipient,
});
export type AddressValues = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  ...recipient,
  deliveryMethod: z.enum(['COURIER', 'PICKUP']),
  paymentMethod: z.enum(['CARD_ONLINE', 'CASH_ON_DELIVERY']),
  comment: z.string().trim().max(500, 'Не больше 500 символов'),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Поставьте оценку').max(5),
  text: z.string().trim().min(1, 'Напишите пару слов о товаре').max(2000, 'Не больше 2000 символов'),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

// Числа из <input> приходят строкой: coerce превращает "1290" в 1290
const rubles = (label: string) =>
  z.coerce
    .number({ error: `Укажите ${label}` })
    .int('Только целые рубли')
    .min(1, 'Больше нуля')
    .max(10_000_000, 'Слишком много');

export const productSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название').max(200),
    description: z.string().trim().min(1, 'Введите описание').max(5000),
    brand: z.string().trim().max(100),
    price: rubles('цену'),
    // Пустое поле — скидки нет
    oldPrice: z.union([z.literal(''), rubles('старую цену')]),
    stock: z.coerce.number({ error: 'Укажите остаток' }).int('Целое число').min(0, 'Не меньше нуля').max(1_000_000),
    icon: z.enum(PRODUCT_ICONS),
    categoryId: z.coerce.number().int().min(1, 'Выберите категорию'),
    isActive: z.boolean(),
  })
  .refine((v) => v.oldPrice === '' || v.oldPrice > v.price, {
    message: 'Старая цена должна быть больше текущей',
    path: ['oldPrice'],
  });
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormValues = z.output<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(50, 'Не больше 50 символов'),
  icon: z.enum(PRODUCT_ICONS),
});
export type CategoryValues = z.infer<typeof categorySchema>;

// Даты — значения <input type="datetime-local"> ('' — без ограничения)
export const bannerSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите заголовок').max(80, 'Не больше 80 символов'),
    subtitle: z.string().trim().max(150, 'Не больше 150 символов'),
    buttonText: z.string().trim().max(30, 'Не больше 30 символов'),
    // Как на сервере: путь внутри магазина, не //evil.com
    link: z
      .string()
      .trim()
      .max(300)
      .regex(/^\/(?![/\\])[^\s\\]*$/, 'Путь внутри магазина, например /?categoryId=1'),
    color: z.enum(BANNER_COLORS),
    icon: z.enum(PRODUCT_ICONS),
    isActive: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'Окончание должно быть позже начала',
    path: ['endsAt'],
  });
export type BannerValues = z.infer<typeof bannerSchema>;

export const replyTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(50, 'Не больше 50 символов'),
  text: z.string().trim().min(1, 'Введите текст').max(300, 'Не больше 300 символов'),
});
export type ReplyTemplateValues = z.infer<typeof replyTemplateSchema>;
