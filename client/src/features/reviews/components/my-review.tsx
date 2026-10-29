'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Pencil, Star } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Stars } from '@/components/price';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/card';
import { TextArea } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { getErrorMessage } from '@/lib/api/errors';
import type { OwnReview, ReviewStatus } from '@/lib/api/types';
import { showToast } from '@/lib/toast';
import { reviewSchema, type ReviewValues } from '@/lib/validation/shop.schemas';
import { useCreateReviewMutation, useUpdateReviewMutation } from '../api';

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; className: string }> = {
  PENDING: { label: 'На модерации', className: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Опубликован', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Отклонён', className: 'bg-rose-50 text-rose-700' },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const { label, className } = REVIEW_STATUS[status];
  return <Badge className={className}>{label}</Badge>;
}

// Свой отзыв на товар: кнопка «Оставить отзыв», либо отзыв со статусом модерации и кнопкой «Изменить».
// Используется на странице заказа (у каждого полученного товара) и на странице товара
export function MyReview({
  productId,
  review,
  defaultOpen = false,
}: {
  productId: number;
  review: OwnReview | null;
  defaultOpen?: boolean;
}) {
  const [editing, setEditing] = useState(defaultOpen);

  if (editing) return <ReviewForm productId={productId} review={review} onDone={() => setEditing(false)} />;

  if (!review) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="self-start">
        <Star className="size-4" /> Оставить отзыв
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Ваш отзыв</span>
        <ReviewStatusBadge status={review.status} />
        <Stars value={review.rating} size="size-4" />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Pencil className="size-3.5" /> Изменить
        </button>
      </div>
      <p className="text-sm whitespace-pre-line text-zinc-700">{review.text}</p>
      {review.status === 'REJECTED' && review.moderatorComment && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <span className="font-medium">Причина: </span>
          {review.moderatorComment}
        </p>
      )}
      {review.status === 'PENDING' && (
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="size-3.5" />
          {review.publishedText
            ? 'Изменения проверяет модератор — пока покупатели видят прежнюю версию'
            : 'Отзыв появится на странице товара после проверки модератором'}
        </p>
      )}
    </div>
  );
}

function ReviewForm({
  productId,
  review,
  onDone,
}: {
  productId: number;
  review: OwnReview | null;
  onDone: () => void;
}) {
  const [createReview, createState] = useCreateReviewMutation();
  const [updateReview, updateState] = useUpdateReviewMutation();
  const state = review ? updateState : createState;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: review?.rating ?? 0, text: review?.text ?? '' },
  });

  const submit = handleSubmit(async (values) => {
    const result = review ? await updateReview({ id: review.id, values }) : await createReview({ productId, values });
    if (result.error) return;
    showToast({
      title: review ? 'Изменения отправлены на модерацию' : 'Отзыв отправлен на модерацию',
      description: 'Обычно проверка занимает немного времени',
    });
    onDone();
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-blue-50/60 p-4" noValidate>
      <p className="text-sm font-semibold">{review ? 'Изменить отзыв' : 'Как вам товар?'}</p>
      <FormError message={state.isError ? getErrorMessage(state.error) : undefined} />
      <Controller
        control={control}
        name="rating"
        render={({ field }) => <Stars value={field.value} onChange={field.onChange} size="size-7" />}
      />
      {errors.rating && <p className="text-xs text-rose-600">{errors.rating.message}</p>}
      <TextArea label="Отзыв" error={errors.text?.message} {...register('text')} />
      <p className="text-xs text-zinc-500">Отзыв опубликуют после проверки модератором</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={state.isLoading}>
          {review ? 'Сохранить' : 'Отправить'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
