'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Pencil, Trash, X } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { IconGlyph, PRODUCT_ICONS } from '@/components/product-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormError } from '@/components/ui/form-error';
import { useGetCategoriesQuery } from '@/features/catalog/api';
import { getErrorMessage } from '@/lib/api/errors';
import type { CategoryWithCount } from '@/lib/api/types';
import { showToast } from '@/lib/toast';
import { categorySchema, type CategoryValues } from '@/lib/validation/shop.schemas';
import { useCreateCategoryMutation, useDeleteCategoryMutation, useUpdateCategoryMutation } from '../api';
import { AdminSkeleton } from './admin-shell';
import { IconButton } from './products-admin';

export function CategoriesAdmin() {
  const { data: categories } = useGetCategoriesQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createCategory, createState] = useCreateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const onDelete = async (category: CategoryWithCount) => {
    if (!confirm(`Удалить категорию «${category.name}»?`)) return;
    const { error } = await deleteCategory(category.id);
    // 409 — в категории есть товары (включая скрытые)
    if (error)
      showToast({ title: 'Нельзя удалить категорию', description: 'Сначала перенесите или удалите её товары' });
  };

  if (!categories) return <AdminSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Категории</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Новая категория</h2>
        <CategoryForm
          submitLabel="Добавить"
          loading={createState.isLoading}
          error={createState.isError ? getErrorMessage(createState.error) : undefined}
          onSubmit={async (values) => !(await createCategory(values)).error}
        />
      </Card>
      <Card className="p-0">
        <ul className="divide-y divide-zinc-100">
          {categories.map((category) =>
            editingId === category.id ? (
              <li key={category.id} className="p-4">
                <EditRow category={category} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <IconGlyph name={category.icon} />
                </span>
                <span className="flex-1 font-medium">{category.name}</span>
                <span className="text-sm text-zinc-500">{category.productsCount} на витрине</span>
                <IconButton label="Редактировать" onClick={() => setEditingId(category.id)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton label="Удалить" danger onClick={() => onDelete(category)}>
                  <Trash className="size-4" />
                </IconButton>
              </li>
            ),
          )}
        </ul>
      </Card>
    </div>
  );
}

function EditRow({ category, onDone }: { category: CategoryWithCount; onDone: () => void }) {
  const [updateCategory, { isLoading, isError, error }] = useUpdateCategoryMutation();
  return (
    <CategoryForm
      defaults={{ name: category.name, icon: category.icon as CategoryValues['icon'] }}
      submitLabel="Сохранить"
      loading={isLoading}
      error={isError ? getErrorMessage(error) : undefined}
      onCancel={onDone}
      onSubmit={async (values) => {
        const ok = !(await updateCategory({ id: category.id, ...values })).error;
        if (ok) onDone();
        return ok;
      }}
    />
  );
}

function CategoryForm({
  defaults = { name: '', icon: 'package' },
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  defaults?: CategoryValues;
  submitLabel: string;
  loading: boolean;
  error?: string;
  onSubmit: (values: CategoryValues) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: defaults });
  const icon = useWatch({ control, name: 'icon' });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={handleSubmit(async (values) => {
        if ((await onSubmit(values)) && !onCancel) reset(); // новую форму очищаем после добавления
      })}
    >
      <FormError message={error} />
      <div className="flex gap-2">
        <input
          placeholder="Название категории"
          aria-label="Название категории"
          aria-invalid={Boolean(errors.name)}
          className="h-10 flex-1 rounded-xl border border-zinc-300 px-3 text-sm aria-[invalid=true]:border-rose-500"
          {...register('name')}
        />
        <Button type="submit" loading={loading}>
          {onCancel ? <Check className="size-4" /> : null}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} aria-label="Отмена">
            <X className="size-4" />
          </Button>
        )}
      </div>
      {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
      <div role="radiogroup" aria-label="Иконка" className="flex flex-wrap gap-1">
        {PRODUCT_ICONS.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={icon === name}
            aria-label={name}
            title={name}
            onClick={() => setValue('icon', name)}
            className={`flex size-9 items-center justify-center rounded-lg ${icon === name ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
          >
            <IconGlyph name={name} className="size-4" />
          </button>
        ))}
      </div>
    </form>
  );
}
