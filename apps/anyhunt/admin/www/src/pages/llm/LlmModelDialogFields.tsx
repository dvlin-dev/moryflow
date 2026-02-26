/**
 * [PROPS]: form + viewModel/actions（identity + capabilities）
 * [EMITS]: onRawConfigTextChange
 * [POS]: LlmModelDialog 字段装配层
 */

import type { UseFormReturn } from 'react-hook-form';
import type { LlmModelFormValues, LlmModelListItem, LlmProviderListItem } from '@/features/llm';
import { ModelCapabilityFields } from './model-dialog-fields/ModelCapabilityFields';
import { ModelIdentityFields } from './model-dialog-fields/ModelIdentityFields';

export interface LlmModelDialogFieldsProps {
  form: UseFormReturn<LlmModelFormValues>;
  viewModel: LlmModelDialogFieldsViewModel;
  actions: LlmModelDialogFieldsActions;
}

export interface LlmModelDialogFieldsViewModel {
  providers: LlmProviderListItem[];
  model: LlmModelListItem | null;
  canSelectProvider: boolean;
  isCreate: boolean;
  isSubmitting: boolean;
  rawConfigText: string;
  rawConfigError: boolean;
}

export interface LlmModelDialogFieldsActions {
  onRawConfigTextChange: (value: string) => void;
}

export function LlmModelDialogFields({ form, viewModel, actions }: LlmModelDialogFieldsProps) {
  const {
    providers,
    model,
    canSelectProvider,
    isCreate,
    isSubmitting,
    rawConfigText,
    rawConfigError,
  } = viewModel;
  const { onRawConfigTextChange } = actions;
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
