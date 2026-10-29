'use client';

import { Check, MessageSquareOff, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Stars } from '@/components/price';
import { ProductImage } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Card, EmptyState } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { Pagination } from '@/components/ui/pagination';
import { ReviewStatusBadge } from '@/features/reviews/components/my-review';
import { useApproveReviewMutation, useGetAdminReviewsQuery, useRejectReviewMutation } from '@/features/reviews/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { AdminReview, ReviewStatus } from '@/lib/api/types';
import { formatDateTime } from '@/lib/format';
import { showToast } from '@/lib/toast';
import { AdminSkeleton } from './admin-shell';

const TABS: Record<ReviewStatus, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Опубликованные',
  REJECTED: 'Отклонённые',
};

// Модерация отзывов: новые и отредактированные ждут проверки, на витрину попадает только одобренное.
// Очередь обновляется сама по событию reviews:changed (RealtimeSync)
export function ReviewsAdmin() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isError, error } = useGetAdminReviewsQuery({ status, page });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Отзывы</h1>
        <p className="text-sm text-zinc-500">
          Покупатели увидят отзыв только после одобрения. Отклонённый автор может исправить
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TABS) as ReviewStatus[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${status === tab ? 'bg-blue-600 text-white' : 'bg-white text-zinc-700 shadow-sm hover:bg-zinc-50'}`}
          >
            {TABS[tab]}
            {tab === 'PENDING' && Boolean(data?.pendingCount) && (
              <span
                className={`rounded-full px-1.5 text-xs ${status === tab ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}
              >
                {data!.pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isError && <FormError message={getErrorMessage(error)} />}
      {!data ? (
        <AdminSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<MessageSquareOff className="size-12" />}
          title={status === 'PENDING' ? 'Все отзывы проверены' : 'Здесь пока пусто'}
        >
          {status === 'PENDING' && <p className="text-sm text-zinc-500">Новые отзывы появятся здесь сами</p>}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

function ReviewCard({ review }: { review: AdminReview }) {
  const [approve, approveState] = useApproveReviewMutation();
  const [reject, rejectState] = useRejectReviewMutation();
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  // Правка уже опубликованного отзыва: показываем, что сейчас на витрине, чтобы видеть разницу
  const isEdit = review.status === 'PENDING' && review.publishedText !== null;

  const run = async (action: Promise<{ error?: unknown }>, success: string) => {
    const { error } = await action;
    if (error) showToast({ title: 'Не получилось', description: getErrorMessage(error as never) });
    else showToast({ title: success });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/product/${review.product.id}`} className="flex min-w-0 items-center gap-3 hover:text-blue-600">
          <ProductImage icon={review.product.icon} className="w-10 shrink-0" />
          <span className="line-clamp-1 font-medium">{review.product.title}</span>
        </Link>
        <span className="ml-auto flex items-center gap-2">
          {isEdit && (
            <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Правка</span>
          )}
          <ReviewStatusBadge status={review.status} />
        </span>
      </div>

      <p className="text-xs text-zinc-500">
        {review.user.name ?? 'Без имени'} · {review.user.email} · {formatDateTime(review.updatedAt)}
      </p>

      <div className="flex flex-col gap-1">
        <Stars value={review.rating} size="size-4" />
        <p className="text-sm whitespace-pre-line">{review.text}</p>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-1 rounded-xl bg-zinc-50 p-3 text-zinc-500">
          <p className="text-xs font-medium">Сейчас опубликовано:</p>
          <Stars value={review.publishedRating ?? 0} size="size-3.5" />
          <p className="text-sm whitespace-pre-line">{review.publishedText}</p>
        </div>
      )}

      {review.status === 'REJECTED' && review.moderatorComment && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <span className="font-medium">Причина: </span>
          {review.moderatorComment}
        </p>
      )}

      {review.status === 'PENDING' &&
        (rejecting ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await run(reject({ id: review.id, updatedAt: review.updatedAt, comment }), 'Отзыв отклонён');
            }}
          >
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Причина — её увидит автор отзыва"
              aria-label="Причина отклонения"
              maxLength={500}
              rows={2}
              autoFocus
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                variant="danger"
                disabled={!comment.trim()}
                loading={rejectState.isLoading}
              >
                Отклонить
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                Отмена
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={approveState.isLoading}
              onClick={() =>
                run(
                  approve({ id: review.id, updatedAt: review.updatedAt, productId: review.productId }),
                  'Отзыв опубликован',
                )
              }
            >
              <Check className="size-4" /> Одобрить
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
              <X className="size-4" /> Отклонить
            </Button>
          </div>
        ))}
    </Card>
  );
}
