/**
 * [PROPS]: form/rawConfig
 * [EMITS]: onRawConfigTextChange
 * [POS]: LLM Model 能力与 reasoning 字段
 */

import { useEffect, useMemo } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@moryflow/ui';
import {
  resolveLlmReasoningPreset,
  type LlmModelFormValues,
  type LlmProviderListItem,
} from '@/features/llm';

export interface ModelCapabilityFieldsProps {
  form: UseFormReturn<LlmModelFormValues>;
  providers: LlmProviderListItem[];
  rawConfigText: string;
  rawConfigError: boolean;
  onRawConfigTextChange: (value: string) => void;
}

export function ModelCapabilityFields({
  form,
  providers,
  rawConfigText,
  rawConfigError,
  onRawConfigTextChange,
}: ModelCapabilityFieldsProps) {
  const providerId = useWatch({
    control: form.control,
    name: 'providerId',
  });
  const modelId = useWatch({
    control: form.control,
    name: 'modelId',
  });
  const reasoningEnabled = useWatch({
    control: form.control,
    name: 'reasoning.enabled',
  });
  const reasoningLevel = useWatch({
    control: form.control,
    name: 'reasoning.level',
  });

  const selectedProviderType = useMemo(
    () => providers.find((provider) => provider.id === providerId)?.providerType,
    [providers, providerId]
  );

  const reasoningPreset = useMemo(
    () =>
      resolveLlmReasoningPreset({
        providerType: selectedProviderType,
        modelId,
      }),
    [modelId, selectedProviderType]
  );

  useEffect(() => {
    if (!reasoningPreset.supportsThinking && reasoningEnabled) {
      form.setValue('reasoning.enabled', false, { shouldDirty: true, shouldValidate: true });
      form.setValue('reasoning.level', 'off', { shouldDirty: true, shouldValidate: true });
    }
  }, [form, reasoningEnabled, reasoningPreset.supportsThinking]);

  useEffect(() => {
    const availableLevels = reasoningPreset.levelOptions.map((option) => option.value);
    if (!reasoningPreset.supportsThinking || availableLevels.length === 0) {
      if (reasoningLevel !== 'off') {
        form.setValue('reasoning.level', 'off', { shouldDirty: true, shouldValidate: true });
      }
      return;
    }

    const isCurrentLevelValid = availableLevels.includes(reasoningLevel);
    if (!isCurrentLevelValid) {
      form.setValue('reasoning.level', reasoningPreset.defaultLevel, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, reasoningLevel, reasoningPreset]);

  const selectedLevelOption = useMemo(
    () =>
      reasoningPreset.levelOptions.find((option) => option.value === reasoningLevel) ??
      reasoningPreset.levelOptions.find((option) => option.value === reasoningPreset.defaultLevel),
    [reasoningLevel, reasoningPreset]
  );

  return (
    <>
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
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!reasoningPreset.supportsThinking}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {!reasoningPreset.supportsThinking ? (
          <p className="text-xs text-muted-foreground">
            Thinking levels are managed by model-bank. The selected model is off-only.
          </p>
        ) : null}

        {reasoningEnabled && reasoningPreset.supportsThinking ? (
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="reasoning.level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thinking level</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasoningPreset.levelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedLevelOption ? (
              <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                {selectedLevelOption.visibleParams.length > 0 ? (
                  selectedLevelOption.visibleParams.map((param) => (
                    <p key={`${param.key}=${param.value}`} className="font-mono">
                      {param.key}: {param.value}
                    </p>
                  ))
                ) : (
                  <p>Selected level has no extra runtime params.</p>
                )}
              </div>
            ) : null}
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
            onChange={(event) => onRawConfigTextChange(event.target.value)}
            placeholder='{"reasoning": {"effort": "high"}}'
            rows={4}
          />
          {rawConfigError ? <p className="text-xs text-destructive">Invalid JSON object.</p> : null}
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
    </>
  );
}
