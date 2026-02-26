/**
 * [PROPS]: form/providers/capabilities/rawConfig
 * [EMITS]: onRawConfigTextChange
 * [POS]: LlmModelDialog 字段装配层
 */

import type { UseFormReturn } from 'react-hook-form';
import type { LlmModelFormValues, LlmModelListItem, LlmProviderListItem } from '@/features/llm';
import { ModelCapabilityFields } from './model-dialog-fields/ModelCapabilityFields';
import { ModelIdentityFields } from './model-dialog-fields/ModelIdentityFields';

export interface LlmModelDialogFieldsProps {
  form: UseFormReturn<LlmModelFormValues>;
  providers: LlmProviderListItem[];
  model: LlmModelListItem | null;
  canSelectProvider: boolean;
  isCreate: boolean;
  isSubmitting: boolean;
  rawConfigText: string;
  rawConfigError: boolean;
  onRawConfigTextChange: (value: string) => void;
}

export function LlmModelDialogFields({
  form,
  providers,
  model,
  canSelectProvider,
  isCreate,
  isSubmitting,
  rawConfigText,
  rawConfigError,
  onRawConfigTextChange,
}: LlmModelDialogFieldsProps) {
  return (
    <>
      <ModelIdentityFields
        form={form}
        providers={providers}
        model={model}
        canSelectProvider={canSelectProvider}
        isCreate={isCreate}
        isSubmitting={isSubmitting}
      />
      <ModelCapabilityFields
        form={form}
        rawConfigText={rawConfigText}
        rawConfigError={rawConfigError}
        onRawConfigTextChange={onRawConfigTextChange}
      />
    </>
  );
}
