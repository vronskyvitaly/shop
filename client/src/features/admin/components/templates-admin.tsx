'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, TextArea } from '@/components/ui/field';
import { FormError } from '@/components/ui/form-error';
import { getErrorMessage } from '@/lib/api/errors';
import type { ReplyTemplate } from '@/lib/api/types';
import { replyTemplateSchema, type ReplyTemplateValues } from '@/lib/validation/shop.schemas';
import {
  useCreateReplyTemplateMutation,
  useDeleteReplyTemplateMutation,
  useGetReplyTemplatesQuery,
  useUpdateReplyTemplateMutation,
} from '../api';
import { AdminSkeleton } from './admin-shell';
import { IconButton } from './products-admin';

// Готовые ответы покупателю: причины отмены и комментарии к смене статуса (выбираются на странице заказа)
export function TemplatesAdmin() {
  const { data: templates, isError, error } = useGetReplyTemplatesQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createTemplate, createState] = useCreateReplyTemplateMutation();
  const [deleteTemplate] = useDeleteReplyTemplateMutation();

  if (isError) return <FormError message={getErrorMessage(error)} />;
  if (!templates) return <AdminSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Шаблоны ответов</h1>
        <p className="text-sm text-zinc-500">
          Причины отмены и комментарии, которые покупатель увидит в истории заказа
        </p>
      </div>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Новый шаблон</h2>
        <TemplateForm
          submitLabel="Добавить"
          loading={createState.isLoading}
          error={createState.isError ? getErrorMessage(createState.error) : undefined}
          onSubmit={async (values) => !(await createTemplate(values)).error}
        />
      </Card>
      {templates.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">Шаблонов пока нет</Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-100">
            {templates.map((template) =>
              editingId === template.id ? (
                <li key={template.id} className="p-4">
                  <EditRow template={template} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={template.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{template.title}</p>
                    <p className="text-sm whitespace-pre-line text-zinc-600">{template.text}</p>
                  </div>
                  <IconButton label="Редактировать" onClick={() => setEditingId(template.id)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Удалить"
                    danger
                    onClick={() => {
                      if (confirm(`Удалить шаблон «${template.title}»?`)) void deleteTemplate(template.id);
                    }}
                  >
                    <Trash className="size-4" />
                  </IconButton>
                </li>
              ),
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

function EditRow({ template, onDone }: { template: ReplyTemplate; onDone: () => void }) {
  const [updateTemplate, { isLoading, isError, error }] = useUpdateReplyTemplateMutation();
  return (
    <TemplateForm
      defaults={{ title: template.title, text: template.text }}
      submitLabel="Сохранить"
      loading={isLoading}
      error={isError ? getErrorMessage(error) : undefined}
      onCancel={onDone}
      onSubmit={async (values) => {
        const ok = !(await updateTemplate({ id: template.id, ...values })).error;
        if (ok) onDone();
        return ok;
      }}
    />
  );
}

function TemplateForm({
  defaults = { title: '', text: '' },
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
}: {
  defaults?: ReplyTemplateValues;
  submitLabel: string;
  loading: boolean;
  error?: string;
  onSubmit: (values: ReplyTemplateValues) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyTemplateValues>({ resolver: zodResolver(replyTemplateSchema), defaultValues: defaults });

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={handleSubmit(async (values) => {
        if ((await onSubmit(values)) && !onCancel) reset(); // новую форму очищаем после добавления
      })}
    >
      <FormError message={error} />
      <Field
        label="Название"
        placeholder="Например: Нет на складе"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextArea label="Текст для покупателя" maxLength={300} error={errors.text?.message} {...register('text')} />
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}
