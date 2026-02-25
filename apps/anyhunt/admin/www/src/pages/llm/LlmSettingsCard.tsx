/**
 * [PROPS]: LlmSettingsCardProps - settings draft + model options + callbacks
 * [EMITS]: onSave/onReset - settings 变更动作
 * [POS]: Admin LLM 配置页的 Settings 区块（默认模型）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import type { UpdateLlmSettingsInput } from '@/features/llm';

const formSchema = z.object({
  defaultAgentModelId: z.string().trim().min(1).max(200),
  defaultExtractModelId: z.string().trim().min(1).max(200),
});

type FormValues = z.infer<typeof formSchema>;

export interface LlmSettingsCardProps {
  isLoading: boolean;
  errorMessage?: string | null;
  isSaving: boolean;
  initialValues: UpdateLlmSettingsInput | null;
  modelOptions: string[];
  onSave: (input: UpdateLlmSettingsInput) => Promise<void>;
  onReset: () => void;
}

export function LlmSettingsCard({
  isLoading,
  errorMessage,
  isSaving,
  initialValues,
  modelOptions,
  onSave,
  onReset,
}: LlmSettingsCardProps) {
  const defaultValues = useMemo<FormValues>(
    () => ({
      defaultAgentModelId: initialValues?.defaultAgentModelId ?? '',
      defaultExtractModelId: initialValues?.defaultExtractModelId ?? '',
    }),
    [initialValues]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const submit = async (values: FormValues) => {
    await onSave(values);
  };

  const disabled = isLoading || !initialValues;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Default models</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              form.reset(defaultValues);
              onReset();
            }}
            disabled={disabled}
          >
            Reset
          </Button>
          <Button
            onClick={form.handleSubmit(submit)}
            disabled={disabled || isSaving || !form.formState.isValid}
          >
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="defaultAgentModelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent default model</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a modelId" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelOptions.length === 0 ? (
                        <SelectItem value={field.value || '__empty'} disabled>
                          Create an enabled model mapping first
                        </SelectItem>
                      ) : null}
                      {modelOptions.map((modelId) => (
                        <SelectItem key={modelId} value={modelId}>
                          {modelId}
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
              name="defaultExtractModelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extract default model</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a modelId" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelOptions.length === 0 ? (
                        <SelectItem value={field.value || '__empty'} disabled>
                          Create an enabled model mapping first
                        </SelectItem>
                      ) : null}
                      {modelOptions.map((modelId) => (
                        <SelectItem key={modelId} value={modelId}>
                          {modelId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
