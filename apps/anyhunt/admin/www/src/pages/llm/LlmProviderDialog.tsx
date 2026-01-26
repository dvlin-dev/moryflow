/**
 * [PROPS]: LlmProviderDialogProps - open/mode/provider/defaults
 * [EMITS]: onClose/onSubmit - Provider 创建/更新动作
 * [POS]: Admin LLM Providers 的创建/编辑弹窗（支持 openai/openai-compatible/openrouter/anthropic/google）
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
  CreateLlmProviderInput,
  LlmProviderListItem,
  LlmProviderType,
  UpdateLlmProviderInput,
  LlmProviderPreset,
} from '@/features/llm';

const formSchema = z.object({
  providerType: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().max(5000),
  baseUrl: z.string().trim().url().or(z.literal('')),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

type FormValues = z.infer<typeof formSchema>;

export interface LlmProviderDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  provider: LlmProviderListItem | null;
  presets: LlmProviderPreset[];
  onClose: () => void;
  onCreate: (input: CreateLlmProviderInput) => Promise<void>;
  onUpdate: (providerId: string, input: UpdateLlmProviderInput) => Promise<void>;
  isSubmitting: boolean;
}

export function LlmProviderDialog({
  open,
  mode,
  provider,
  presets,
  onClose,
  onCreate,
  onUpdate,
  isSubmitting,
}: LlmProviderDialogProps) {
  const isCreate = mode === 'create';

  const defaults = useMemo<FormValues>(() => {
    if (isCreate) {
      const firstPreset = presets[0]?.id ?? 'openai';
      return {
        providerType: firstPreset,
        name: '',
        apiKey: '',
        baseUrl: '',
        enabled: true,
        sortOrder: 0,
      };
    }

    return {
      providerType: provider?.providerType ?? 'openai',
      name: provider?.name ?? '',
      apiKey: '',
      baseUrl: provider?.baseUrl ?? '',
      enabled: provider?.enabled ?? true,
      sortOrder: provider?.sortOrder ?? 0,
    };
  }, [isCreate, provider, presets]);

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

  const watchedProviderType = form.watch('providerType');
  const watchedApiKey = form.watch('apiKey');
  const selectedPreset = useMemo(() => {
    return presets.find((preset) => preset.id === watchedProviderType);
  }, [presets, watchedProviderType]);
  const availablePresets = useMemo(() => {
    const presetIds = new Set(presets.map((preset) => preset.id));
    if (provider?.providerType && !presetIds.has(provider.providerType)) {
      return [
        ...presets,
        {
          id: provider.providerType,
          name: provider.providerType,
          sdkType: 'custom',
          defaultBaseUrl: '',
        },
      ];
    }
    return presets;
  }, [presets, provider?.providerType]);

  const submit = async (values: FormValues) => {
    if (isCreate) {
      const apiKey = values.apiKey.trim();
      if (!apiKey) {
        form.setError('apiKey', { type: 'manual', message: 'API key is required' });
        return;
      }

      const input: CreateLlmProviderInput = {
        providerType: values.providerType as LlmProviderType,
        name: values.name.trim(),
        apiKey,
        ...(values.baseUrl.trim() ? { baseUrl: values.baseUrl.trim() } : {}),
        enabled: values.enabled,
        sortOrder: values.sortOrder,
      };
      await onCreate(input);
      return;
    }

    if (!provider) return;

    const input: UpdateLlmProviderInput = {
      name: values.name.trim(),
      enabled: values.enabled,
      sortOrder: values.sortOrder,
      baseUrl: values.baseUrl.trim() ? values.baseUrl.trim() : null,
      ...(values.apiKey.trim() ? { apiKey: values.apiKey.trim() } : {}),
    };

    await onUpdate(provider.id, input);
  };

  const title = isCreate ? 'New provider' : 'Edit provider';
  const description = isCreate
    ? 'Create a provider configuration (apiKey is encrypted in the database).'
    : 'Update provider settings. Current apiKey is never returned; setting a new apiKey is optional. Clear Base URL to use the provider default.';

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
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!isCreate || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name} ({preset.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPreset?.description ? (
                    <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="OpenAI / OpenRouter / Gateway" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={selectedPreset?.defaultBaseUrl || 'https://api.openai.com/v1'}
                      autoComplete="off"
                    />
                  </FormControl>
                  {selectedPreset?.defaultBaseUrl ? (
                    <p className="text-xs text-muted-foreground">
                      Default: {selectedPreset.defaultBaseUrl}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isCreate ? 'API key' : 'New API key (optional)'}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={isCreate ? '' : 'Leave blank to keep'}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
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

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || !form.formState.isValid || (isCreate && !watchedApiKey.trim())
                }
              >
                {isCreate ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
