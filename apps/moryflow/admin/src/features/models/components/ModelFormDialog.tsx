/**
 * [PROPS]: { open, onOpenChange, model, providers }
 * [EMITS]: 提交创建/更新模型
 * [POS]: Model 表单对话框容器，负责搜索建议与提交编排
 */

import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { createModelSchema, type CreateModelFormData } from '@/lib/validations/model';
import { useCreateModel, useUpdateModel } from '../hooks';
import type { AiModel, AiProvider } from '@/types/api';
import { searchModels, type ModelInfo } from '@moryflow/model-bank/registry';
import {
  getInitialRawConfigText,
  getModelFormDefaultValues,
} from './model-form-dialog/form-defaults';
import { ModelSearchSection } from './model-form-dialog/model-search-section';
import { ModelBasicFieldsSection } from './model-form-dialog/model-basic-fields-section';
import { ModelReasoningSection } from './model-form-dialog/model-reasoning-section';

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AiModel;
  providers: AiProvider[];
}

type ModelFormDialogContentProps = Omit<ModelFormDialogProps, 'open'>;

function ModelFormDialogContent({ onOpenChange, model, providers }: ModelFormDialogContentProps) {
  const isEditing = !!model;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rawConfigText, setRawConfigText] = useState(() => getInitialRawConfigText(model));
  const [rawConfigError, setRawConfigError] = useState(false);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return [];
    }
    return searchModels({ query: searchQuery, limit: 10, mode: 'chat' });
  }, [searchQuery]);

  const form = useForm<CreateModelFormData>({
    resolver: zodResolver(createModelSchema),
    defaultValues: getModelFormDefaultValues(model, providers),
  });

  const reasoningEnabled =
    useWatch({
      control: form.control,
      name: 'reasoning.enabled',
    }) ?? false;

  const createMutation = useCreateModel();
  const updateMutation = useUpdateModel();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSelectModel = (modelInfo: ModelInfo) => {
    form.setValue('modelId', modelInfo.id);
    form.setValue('upstreamId', modelInfo.id);
    form.setValue('displayName', modelInfo.displayName);
    form.setValue('maxContextTokens', modelInfo.maxContextTokens);
    form.setValue('maxOutputTokens', modelInfo.maxOutputTokens);
    form.setValue('inputTokenPrice', modelInfo.inputPricePerMillion);
    form.setValue('outputTokenPrice', modelInfo.outputPricePerMillion);
    form.setValue('capabilities', {
      vision: modelInfo.capabilities.vision,
      tools: modelInfo.capabilities.tools,
      json: modelInfo.capabilities.json,
    });

    if (modelInfo.capabilities.reasoning) {
      form.setValue('reasoning', {
        enabled: true,
        effort: 'medium',
      });
    }

    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = (data: CreateModelFormData) => {
    if (isEditing && model) {
      updateMutation.mutate({ id: model.id, data }, { onSuccess: () => onOpenChange(false) });
      return;
    }

    createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? '编辑 Model' : '添加 Model'}</DialogTitle>
        <DialogDescription>{isEditing ? '修改 Model 配置' : '添加新的 AI 模型'}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <ModelSearchSection
            isEditing={isEditing}
            searchOpen={searchOpen}
            searchQuery={searchQuery}
            suggestions={suggestions}
            onSearchOpenChange={setSearchOpen}
            onSearchQueryChange={setSearchQuery}
            onSelectModel={handleSelectModel}
          />

          <ModelBasicFieldsSection form={form} providers={providers} isEditing={isEditing} />

          <ModelReasoningSection
            form={form}
            reasoningEnabled={reasoningEnabled}
            rawConfigText={rawConfigText}
            rawConfigError={rawConfigError}
            onRawConfigTextChange={setRawConfigText}
            onRawConfigErrorChange={setRawConfigError}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export function ModelFormDialog({ open, onOpenChange, model, providers }: ModelFormDialogProps) {
  const dialogKey = `${open ? 'open' : 'closed'}-${model?.id ?? 'new'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModelFormDialogContent
        key={dialogKey}
        onOpenChange={onOpenChange}
        model={model}
        providers={providers}
      />
    </Dialog>
  );
}
