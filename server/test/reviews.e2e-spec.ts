import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import {
  createProduct,
  createTestApp,
  orderForm,
  registerUser,
  type Agent,
} from './utils.js';

type OwnReview = {
  id: number;
  productId: number;
  rating: number;
  text: string;
  status: string;
  publishedText: string | null;
  moderatorComment: string | null;
  updatedAt: string;
};

// Отзыв → модерация → публикация; правка снова на модерацию, на витрине пока прежняя версия
describe('Отзывы с модерацией (e2e)', () => {
  let app: INestApplication<App>;
  let admin: Agent;

  beforeAll(async () => {
    app = await createTestApp();
    ({ agent: admin } = await registerUser(app, { admin: true }));
  });

  afterAll(async () => {
    await app.close();
  });

  // Покупатель получил товар
  async function deliveredProduct() {
    const product = await createProduct(admin);
    const { agent: buyer } = await registerUser(app);
    await buyer.post('/cart/items').send({ productId: product.id }).expect(201);
    const { body: order } = await buyer
      .post('/orders')
      .send(orderForm)
      .expect(201);
    for (const status of ['CONFIRMED', 'ASSEMBLING', 'SHIPPED', 'DELIVERED']) {
      await admin
        .patch(`/admin/orders/${order.id}/status`)
        .send({ status })
        .expect(200);
    }
    return { product, buyer };
  }

  const published = async (productId: number) =>
    (await admin.get(`/products/${productId}/reviews`).expect(200)).body as {
      rating: number;
      text: string;
    }[];
  const productRating = async (productId: number) =>
    (await admin.get(`/products/${productId}`).expect(200)).body as {
      rating: number;
      reviewsCount: number;
    };

  it('новый отзыв не виден, пока админ не одобрит; рейтинг считается по одобренным', async () => {
    const { product, buyer } = await deliveredProduct();
    const { body: review } = (await buyer
      .post(`/products/${product.id}/reviews`)
      .send({ rating: 4, text: '  Хороший товар  ' })
      .expect(201)) as { body: OwnReview };
    expect(review).toMatchObject({
      status: 'PENDING',
      text: 'Хороший товар',
      publishedText: null,
    });
    expect(await published(product.id)).toEqual([]);

    // Админ видит его в очереди
    const { body: queue } = await admin.get('/admin/reviews').expect(200);
    expect(queue.pendingCount).toBeGreaterThan(0);
    expect(queue.items).toContainEqual(
      expect.objectContaining({
        id: review.id,
        product: expect.objectContaining({ id: product.id }),
      }),
    );
    expect(
      (await admin.get('/admin/stats').expect(200)).body.pendingReviews,
    ).toBeGreaterThan(0);

    await admin
      .post(`/admin/reviews/${review.id}/approve`)
      .send({ updatedAt: review.updatedAt })
      .expect(204);
    expect(await published(product.id)).toEqual([
      expect.objectContaining({
        rating: 4,
        text: 'Хороший товар',
        edited: false,
      }),
    ]);
    expect(await productRating(product.id)).toMatchObject({
      rating: 4,
      reviewsCount: 1,
    });
    // Повторно не проверить
    await admin
      .post(`/admin/reviews/${review.id}/approve`)
      .send({ updatedAt: review.updatedAt })
      .expect(409);
  });

  it('правка уходит на модерацию, а на витрине остаётся одобренная версия; отклонение — с причиной', async () => {
    const { product, buyer } = await deliveredProduct();
    const { body: first } = (await buyer
      .post(`/products/${product.id}/reviews`)
      .send({ rating: 5, text: 'Отлично' })
      .expect(201)) as {
      body: OwnReview;
    };
    await admin
      .post(`/admin/reviews/${first.id}/approve`)
      .send({ updatedAt: first.updatedAt })
      .expect(204);

    const { body: edited } = (await buyer
      .patch(`/reviews/${first.id}`)
      .send({ rating: 2, text: 'Сломался через неделю' })
      .expect(200)) as {
      body: OwnReview;
    };
    expect(edited).toMatchObject({
      status: 'PENDING',
      rating: 2,
      publishedText: 'Отлично',
    });
    expect(await published(product.id)).toEqual([
      expect.objectContaining({ rating: 5, text: 'Отлично' }),
    ]);

    // Без причины не отклонить
    await admin
      .post(`/admin/reviews/${first.id}/reject`)
      .send({ updatedAt: edited.updatedAt, comment: ' ' })
      .expect(400);
    await admin
      .post(`/admin/reviews/${first.id}/reject`)
      .send({
        updatedAt: edited.updatedAt,
        comment: 'Уберите ссылку на другой магазин',
      })
      .expect(204);

    const { body: mine } = (await buyer.get('/reviews/mine').expect(200)) as {
      body: OwnReview[];
    };
    expect(mine.find((r) => r.id === first.id)).toMatchObject({
      status: 'REJECTED',
      moderatorComment: 'Уберите ссылку на другой магазин',
    });
    // Отклонили правку — прежний текст и рейтинг на месте
    expect(await published(product.id)).toEqual([
      expect.objectContaining({ rating: 5, text: 'Отлично' }),
    ]);
    expect(await productRating(product.id)).toMatchObject({
      rating: 5,
      reviewsCount: 1,
    });

    // Исправил — снова на модерацию, одобрили — рейтинг пересчитан
    const { body: fixed } = (await buyer
      .patch(`/reviews/${first.id}`)
      .send({ rating: 3, text: 'Средне' })
      .expect(200)) as {
      body: OwnReview;
    };
    expect(fixed).toMatchObject({ status: 'PENDING', moderatorComment: null });
    await admin
      .post(`/admin/reviews/${first.id}/approve`)
      .send({ updatedAt: fixed.updatedAt })
      .expect(204);
    expect(await productRating(product.id)).toMatchObject({
      rating: 3,
      reviewsCount: 1,
    });
  });

  it('нельзя одобрить версию, которую админ не видел; чужой отзыв не изменить; модерация только для админа', async () => {
    const { product, buyer } = await deliveredProduct();
    const { body: review } = (await buyer
      .post(`/products/${product.id}/reviews`)
      .send({ rating: 4, text: 'Версия 1' })
      .expect(201)) as {
      body: OwnReview;
    };
    await new Promise((resolve) => setTimeout(resolve, 5)); // чтобы updatedAt точно отличался
    await buyer
      .patch(`/reviews/${review.id}`)
      .send({ rating: 1, text: 'Версия 2' })
      .expect(200);
    await admin
      .post(`/admin/reviews/${review.id}/approve`)
      .send({ updatedAt: review.updatedAt })
      .expect(409);

    const { agent: stranger } = await registerUser(app);
    await stranger
      .patch(`/reviews/${review.id}`)
      .send({ rating: 5, text: 'Взлом' })
      .expect(404);
    await buyer.get('/admin/reviews').expect(403);
    await buyer
      .post(`/admin/reviews/${review.id}/approve`)
      .send({ updatedAt: review.updatedAt })
      .expect(403);

    // Покупатель видит свой отзыв в eligibility — форма редактирования вместо новой
    const { body: eligibility } = await buyer
      .get(`/products/${product.id}/reviews/eligibility`)
      .expect(200);
    expect(eligibility).toMatchObject({
      canReview: false,
      purchased: true,
      review: expect.objectContaining({ text: 'Версия 2' }),
    });
  });
});
