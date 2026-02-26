/**
 * [PROPS]: LlmProviderDialogProps - viewModel/actions
 * [EMITS]: onClose/onSubmit - Provider 创建/更新动作
 * [POS]: Admin LLM Providers 的创建/编辑弹窗
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
} from '@moryflow/ui';
import {
  buildAvailableProviderPresets,
  buildLlmProviderFormDefaults,
  llmProviderFormSchema,
  toCreateLlmProviderInput,
  toUpdateLlmProviderInput,
  type LlmProviderFormValues,
  type CreateLlmProviderInput,
  type LlmProviderListItem,
  type LlmProviderPreset,
  type UpdateLlmProviderInput,
} from '@/features/llm';

export interface LlmProviderDialogProps {
  viewModel: LlmProviderDialogViewModel;
  actions: LlmProviderDialogActions;
}

export interface LlmProviderDialogViewModel {
  open: boolean;
  mode: 'create' | 'edit';
  provider: LlmProviderListItem | null;
  presets: LlmProviderPreset[];
  isSubmitting: boolean;
}

export interface LlmProviderDialogActions {
  onClose: () => void;
  onCreate: (input: CreateLlmProviderInput) => Promise<void>;
  onUpdate: (providerId: string, input: UpdateLlmProviderInput) => Promise<void>;
}

export function LlmProviderDialog({ viewModel, actions }: LlmProviderDialogProps) {
  const { open, mode, provider, presets, isSubmitting } = viewModel;
  const { onClose, onCreate, onUpdate } = actions;
  const isCreate = mode === 'create';

  const defaults = useMemo(
    () =>
      buildLlmProviderFormDefaults({
        mode,
        provider,
        presets,
      }),
    [mode, provider, presets]
  );

  const availablePresets = useMemo(
    () =>
      buildAvailableProviderPresets({
        presets,
        providerType: provider?.providerType,
      }),
    [presets, provider?.providerType]
  );

  const form = useForm<LlmProviderFormValues>({
    resolver: zodResolver(llmProviderFormSchema),
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
  const selectedPreset = useMemo(
    () => availablePresets.find((preset) => preset.id === watchedProviderType),
    [availablePresets, watchedProviderType]
  );

  const submit = async (values: LlmProviderFormValues) => {
    if (isCreate) {
      if (!values.apiKey.trim()) {
        form.setError('apiKey', { type: 'manual', message: 'API key is required' });
        return;
      }
      await onCreate(toCreateLlmProviderInput(values));
      return;
    }

    if (!provider) {
      return;
    }

    await onUpdate(provider.id, toUpdateLlmProviderInput(values));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? 'New provider' : 'Edit provider'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Create a provider configuration (apiKey is encrypted in the database).'
              : 'Update provider settings. Current apiKey is never returned; setting a new apiKey is optional. Clear Base URL to use the provider default.'}
          </DialogDescription>
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
