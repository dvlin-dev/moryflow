/**
 * [PROPS]: LlmModelDialogProps - open/mode/model/defaults/providers
 * [EMITS]: onClose/onSubmit - Model 创建/更新动作
 * [POS]: Admin LLM Models 映射的创建/编辑弹窗
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useMemo, useState } from 'react';
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
} from '@moryflow/ui';
import {
  buildLlmModelFormDefaults,
  llmModelFormSchema,
  parseReasoningRawConfigInput,
  stringifyJsonSafe,
  toCreateLlmModelInput,
  toUpdateLlmModelInput,
  type CreateLlmModelInput,
  type LlmModelFormValues,
  type LlmModelListItem,
  type LlmProviderListItem,
  type UpdateLlmModelInput,
  parseLlmCapabilities,
} from '@/features/llm';
import { LlmModelDialogFields } from './LlmModelDialogFields';

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

  const defaults = useMemo(
    () =>
      buildLlmModelFormDefaults({
        mode,
        model,
        providers,
      }),
    [mode, model, providers]
  );

  const parsedCapabilities = useMemo(() => parseLlmCapabilities(model?.capabilitiesJson), [model]);
  const [rawConfigText, setRawConfigText] = useState<string>(() =>
    stringifyJsonSafe(parsedCapabilities.reasoning?.rawConfig)
  );
  const [rawConfigError, setRawConfigError] = useState(false);

  const form = useForm<LlmModelFormValues>({
    resolver: zodResolver(llmModelFormSchema) as never,
    values: defaults,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaults);
      return;
    }

    setRawConfigText(stringifyJsonSafe(parsedCapabilities.reasoning?.rawConfig));
    setRawConfigError(false);
  }, [defaults, form, open, parsedCapabilities.reasoning?.rawConfig]);

  const submit = async (values: LlmModelFormValues) => {
    const rawConfigResult = parseReasoningRawConfigInput(rawConfigText);
    if (!rawConfigResult.valid) {
      setRawConfigError(true);
      return;
    }

    setRawConfigError(false);

    if (isCreate) {
      await onCreate(toCreateLlmModelInput(values, rawConfigResult.rawConfig));
      return;
    }

    if (!model) {
      return;
    }

    await onUpdate(model.id, toUpdateLlmModelInput(values, rawConfigResult.rawConfig));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'New model' : 'Edit model'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Create a new model mapping with capabilities and pricing.'
              : 'Update model mapping details and capabilities.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <LlmModelDialogFields
              form={form}
              providers={providers}
              model={model}
              canSelectProvider={canSelectProvider}
              isCreate={isCreate}
              isSubmitting={isSubmitting}
              rawConfigText={rawConfigText}
              rawConfigError={rawConfigError}
              onRawConfigTextChange={(value) => {
                setRawConfigText(value);
                setRawConfigError(false);
              }}
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
