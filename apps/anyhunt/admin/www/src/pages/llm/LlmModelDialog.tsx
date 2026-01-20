/**
 * [PROPS]: LlmModelDialogProps - open/mode/model/defaults/providers
 * [EMITS]: onClose/onSubmit - Model 创建/更新动作
 * [POS]: Admin LLM Models 映射的创建/编辑弹窗
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@anyhunt/ui';
import type {
  CreateLlmModelInput,
  LlmModelListItem,
  LlmProviderListItem,
  UpdateLlmModelInput,
} from '@/features/llm';

const formSchema = z.object({
  providerId: z.string().trim().min(1).max(50),
  modelId: z.string().trim().min(1).max(200),
  upstreamId: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface LlmModelDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  model: LlmModelListItem | null;
  providers: LlmProviderListItem[];
  onClose: () => void;
  onCreate: (input: CreateLlmModelInput) => Promise<void>;
  onUpdate: (llmModelId: string, input: UpdateLlmModelInput) => Promise<void>;
  isSubmitting: boolean;
}

export function LlmModelDialog({
  open,
  mode,
  model,
  providers,
  onClose,
  onCreate,
  onUpdate,
  isSubmitting,
}: LlmModelDialogProps) {
  const isCreate = mode === 'create';
  const canSelectProvider = isCreate || !model?.providerId;

  const defaults = useMemo<FormValues>(() => {
    if (isCreate) {
      return {
        providerId: providers[0]?.id ?? '',
        modelId: '',
        upstreamId: '',
        enabled: true,
      };
    }

    return {
      providerId: model?.providerId ?? '',
      modelId: model?.modelId ?? '',
      upstreamId: model?.upstreamId ?? '',
      enabled: model?.enabled ?? true,
    };
  }, [isCreate, model, providers]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: defaults,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
    }
  }, [defaults, form, open]);

  const submit = async (values: FormValues) => {
    if (isCreate) {
      const input: CreateLlmModelInput = {
        providerId: values.providerId.trim(),
        modelId: values.modelId.trim(),
        upstreamId: values.upstreamId.trim(),
        enabled: values.enabled,
      };
      await onCreate(input);
      return;
    }

    if (!model) return;
    const input: UpdateLlmModelInput = {
      modelId: values.modelId.trim(),
      upstreamId: values.upstreamId.trim(),
      enabled: values.enabled,
    };
    await onUpdate(model.id, input);
  };

  const title = isCreate ? 'New model mapping' : 'Edit model mapping';
  const description = isCreate
    ? 'Map a public modelId to an upstreamId under a provider.'
    : 'Update the mapping for this model record.';

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canSelectProvider || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.providerType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!canSelectProvider ? (
                    <p className="text-xs text-muted-foreground">
                      Provider cannot be changed after creation.
                    </p>
                  ) : null}
                  {canSelectProvider && !isCreate && !model?.providerId ? (
                    <p className="text-xs text-destructive">
                      Provider is missing. Please select one to recover this mapping.
                    </p>
                  ) : null}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>modelId (public)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="gpt-4o" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="upstreamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>upstreamId (provider)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="openai/gpt-4o" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <FormLabel className="mb-0">Enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isCreate ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
