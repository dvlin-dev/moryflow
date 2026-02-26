/**
 * [PROPS]: form/rawConfig
 * [EMITS]: onRawConfigTextChange
 * [POS]: LLM Model 能力与 reasoning 字段
 */

import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@moryflow/ui';
import { llmReasoningEffortOptions, type LlmModelFormValues } from '@/features/llm';

export interface ModelCapabilityFieldsProps {
  form: UseFormReturn<LlmModelFormValues>;
  rawConfigText: string;
  rawConfigError: boolean;
  onRawConfigTextChange: (value: string) => void;
}

export function ModelCapabilityFields({
  form,
  rawConfigText,
  rawConfigError,
  onRawConfigTextChange,
}: ModelCapabilityFieldsProps) {
  const reasoningEnabled = useWatch({
    control: form.control,
    name: 'reasoning.enabled',
  });

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
                      {llmReasoningEffortOptions.map((option) => (
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
