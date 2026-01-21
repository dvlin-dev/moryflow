/**
 * [PROPS]: { open, onOpenChange, existingModelIds, onAdd }
 * [EMITS]: onAdd({ id, name }) - 添加自定义服务商模型条目（enabled 默认 true 由上层决定）
 * [POS]: Custom Provider 的模型录入弹窗（只负责收集 id/name，校验与提交）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@anyhunt/ui/components/dialog';
import { Label } from '@anyhunt/ui/components/label';
import { Input } from '@anyhunt/ui/components/input';
import { Button } from '@anyhunt/ui/components/button';

type AddCustomProviderModelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingModelIds: string[];
  onAdd: (data: { id: string; name: string }) => void;
};

export const AddCustomProviderModelDialog = ({
  open,
  onOpenChange,
  existingModelIds,
  onAdd,
}: AddCustomProviderModelDialogProps) => {
  const schema = useMemo(() => {
    return z
      .object({
        id: z.string().min(1, 'Model ID is required'),
        name: z.string().min(1, 'Model name is required'),
      })
      .superRefine((value, ctx) => {
        const id = value.id.trim();
        const name = value.name.trim();
        if (!id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['id'],
            message: 'Model ID is required',
          });
          return;
        }
        if (!name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['name'],
            message: 'Model name is required',
          });
        }
        if (existingModelIds.includes(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['id'],
            message: 'Model ID already exists',
          });
        }
      });
  }, [existingModelIds]);

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { id: '', name: '' },
    mode: 'onSubmit',
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  useEffect(() => {
    if (!open) {
      reset({ id: '', name: '' });
    }
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    const id = values.id.trim();
    const name = values.name.trim();
    onAdd({ id, name });
    reset({ id: '', name: '' });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add model</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="grid gap-4 py-2"
        >
          <div className="space-y-2">
            <Label htmlFor="custom-model-id">
              Model ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="custom-model-id"
              placeholder="e.g. gpt-4o, claude-3-5-sonnet, o4-mini"
              {...register('id')}
            />
            {errors.id?.message && <p className="text-xs text-destructive">{errors.id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-model-name">
              Model name <span className="text-destructive">*</span>
            </Label>
            <Input id="custom-model-name" placeholder="Display name" {...register('name')} />
            {errors.name?.message && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
