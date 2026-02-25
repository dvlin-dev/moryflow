/**
 * [PROPS]: LlmModelDialogProps - open/mode/model/defaults/providers
 * [EMITS]: onClose/onSubmit - Model 创建/更新动作
 * [POS]: Admin LLM Models 映射的创建/编辑弹窗（完整能力配置 + reasoning raw config 校验/编辑）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
  Label,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@moryflow/ui';
import type {
  CreateLlmModelInput,
  LlmModelListItem,
  LlmProviderListItem,
  ReasoningConfig,
  UpdateLlmModelInput,
} from '@/features/llm';
import { parseLlmCapabilities, stringifyJsonSafe } from '@/features/llm/utils';
import type { SubscriptionTier } from '@/lib/types';

const reasoningEffortOptions: Array<{ value: ReasoningConfig['effort']; label: string }> = [
  { value: 'xhigh', label: 'xhigh' },
  { value: 'high', label: 'high' },
  { value: 'medium', label: 'medium' },
  { value: 'low', label: 'low' },
  { value: 'minimal', label: 'minimal' },
  { value: 'none', label: 'none' },
];

const tierOptions: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'FREE' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'PRO', label: 'PRO' },
  { value: 'TEAM', label: 'TEAM' },
];

const optionalPositiveNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().positive().optional()
);

const formSchema = z.object({
  providerId: z.string().trim().min(1).max(50),
  modelId: z.string().trim().min(1).max(200),
  upstreamId: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
  inputTokenPrice: z.coerce.number().min(0),
  outputTokenPrice: z.coerce.number().min(0),
  minTier: z.enum(['FREE', 'BASIC', 'PRO', 'TEAM']),
  maxContextTokens: z.coerce.number().int().positive(),
  maxOutputTokens: z.coerce.number().int().positive(),
  capabilities: z.object({
    vision: z.boolean(),
    tools: z.boolean(),
    json: z.boolean(),
  }),
  reasoning: z.object({
    enabled: z.boolean(),
    effort: z.enum(['xhigh', 'high', 'medium', 'low', 'minimal', 'none']),
    maxTokens: optionalPositiveNumber,
    exclude: z.boolean(),
  }),
  sortOrder: z.coerce.number().int().min(0).max(10000),
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
  const parsedCaps = useMemo(() => parseLlmCapabilities(model?.capabilitiesJson), [model]);

  const defaults = useMemo<FormValues>(() => {
    if (isCreate) {
      return {
        providerId: providers[0]?.id ?? '',
        modelId: '',
        upstreamId: '',
        displayName: '',
        enabled: true,
        inputTokenPrice: 0,
        outputTokenPrice: 0,
        minTier: 'FREE',
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
        capabilities: {
          vision: false,
          tools: false,
          json: false,
        },
        reasoning: {
          enabled: false,
          effort: 'medium',
          maxTokens: undefined,
          exclude: false,
        },
        sortOrder: 0,
      };
    }

    return {
      providerId: model?.providerId ?? '',
      modelId: model?.modelId ?? '',
      upstreamId: model?.upstreamId ?? '',
      displayName: model?.displayName ?? model?.modelId ?? '',
      enabled: model?.enabled ?? true,
      inputTokenPrice: model?.inputTokenPrice ?? 0,
      outputTokenPrice: model?.outputTokenPrice ?? 0,
      minTier: (model?.minTier as SubscriptionTier) ?? 'FREE',
      maxContextTokens: model?.maxContextTokens ?? parsedCaps.maxContextTokens ?? 128000,
      maxOutputTokens: model?.maxOutputTokens ?? parsedCaps.maxOutputTokens ?? 4096,
      capabilities: {
        vision: parsedCaps.vision ?? false,
        tools: parsedCaps.tools ?? false,
        json: parsedCaps.json ?? false,
      },
      reasoning: {
        enabled: parsedCaps.reasoning?.enabled ?? false,
        effort: parsedCaps.reasoning?.effort ?? 'medium',
        maxTokens: parsedCaps.reasoning?.maxTokens,
        exclude: parsedCaps.reasoning?.exclude ?? false,
      },
      sortOrder: model?.sortOrder ?? 0,
    };
  }, [isCreate, model, parsedCaps, providers]);

  const [rawConfigText, setRawConfigText] = useState<string>(() =>
    stringifyJsonSafe(parsedCaps.reasoning?.rawConfig)
  );
  const [rawConfigError, setRawConfigError] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    values: defaults,
    mode: 'onChange',
  });

  const reasoningEnabled = useWatch({
    control: form.control,
    name: 'reasoning.enabled',
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
      return;
    }
    setRawConfigText(stringifyJsonSafe(parsedCaps.reasoning?.rawConfig));
    setRawConfigError(false);
  }, [defaults, form, open, parsedCaps.reasoning?.rawConfig]);

  const submit = async (values: FormValues) => {
    let rawConfig: Record<string, unknown> | undefined;
    if (rawConfigText.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawConfigText) as unknown;
      } catch {
        setRawConfigError(true);
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setRawConfigError(true);
        return;
      }
      rawConfig = parsed as Record<string, unknown>;
      setRawConfigError(false);
    }

    const reasoning: ReasoningConfig = {
      enabled: values.reasoning.enabled,
      effort: values.reasoning.effort,
      maxTokens: values.reasoning.maxTokens,
      exclude: values.reasoning.exclude,
      ...(rawConfig ? { rawConfig } : {}),
    };

    if (isCreate) {
      const input: CreateLlmModelInput = {
        providerId: values.providerId.trim(),
        modelId: values.modelId.trim(),
        upstreamId: values.upstreamId.trim(),
        displayName: values.displayName.trim(),
        enabled: values.enabled,
        inputTokenPrice: values.inputTokenPrice,
        outputTokenPrice: values.outputTokenPrice,
        minTier: values.minTier as SubscriptionTier,
        maxContextTokens: values.maxContextTokens,
        maxOutputTokens: values.maxOutputTokens,
        capabilities: {
          ...values.capabilities,
          maxContextTokens: values.maxContextTokens,
          maxOutputTokens: values.maxOutputTokens,
        },
        reasoning,
        sortOrder: values.sortOrder,
      };
      await onCreate(input);
      return;
    }

    if (!model) return;
    const input: UpdateLlmModelInput = {
      modelId: values.modelId.trim(),
      upstreamId: values.upstreamId.trim(),
      displayName: values.displayName.trim(),
      enabled: values.enabled,
      inputTokenPrice: values.inputTokenPrice,
      outputTokenPrice: values.outputTokenPrice,
      minTier: values.minTier as SubscriptionTier,
      maxContextTokens: values.maxContextTokens,
      maxOutputTokens: values.maxOutputTokens,
      capabilities: {
        ...values.capabilities,
        maxContextTokens: values.maxContextTokens,
        maxOutputTokens: values.maxOutputTokens,
      },
      reasoning,
      sortOrder: values.sortOrder,
    };
    await onUpdate(model.id, input);
  };

  const title = isCreate ? 'New model' : 'Edit model';
  const description = isCreate
    ? 'Create a new model mapping with capabilities and pricing.'
    : 'Update model mapping details and capabilities.';

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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

            <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="GPT-4o" autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="inputTokenPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input price (USD / 1M)</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputTokenPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output price (USD / 1M)</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="minTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum tier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tierOptions.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="maxContextTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max context tokens</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxOutputTokens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max output tokens</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="capabilities.vision"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <FormLabel className="mb-0">Vision</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capabilities.tools"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <FormLabel className="mb-0">Tools</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capabilities.json"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <FormLabel className="mb-0">JSON</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-md border border-border px-3 py-3">
              <FormField
                control={form.control}
                name="reasoning.enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel className="mb-0">Reasoning</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {reasoningEnabled ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="reasoning.effort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effort</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select effort" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reasoningEffortOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value ?? 'medium'}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reasoning.maxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max reasoning tokens</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="numeric" placeholder="Optional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="reasoning.exclude"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <FormLabel className="mb-0">Exclude reasoning</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Raw config (optional JSON)</Label>
                <Textarea
                  value={rawConfigText}
                  onChange={(event) => {
                    setRawConfigText(event.target.value);
                    setRawConfigError(false);
                  }}
                  placeholder='{\"reasoning\": {\"effort\": \"high\"}}'
                  rows={4}
                />
                {rawConfigError ? (
                  <p className="text-xs text-destructive">Invalid JSON object.</p>
                ) : null}
              </div>
            </div>

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
