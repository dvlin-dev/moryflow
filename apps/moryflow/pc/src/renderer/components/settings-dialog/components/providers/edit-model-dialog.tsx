/**
 * [PROPS]: EditModelDialogProps - 编辑模型配置所需参数
 * [EMITS]: onSave(data) - 提交模型配置
 * [POS]: Providers 模型编辑弹窗
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, type ComponentProps } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@moryflow/ui/components/dialog';
import { Input } from '@moryflow/ui/components/input';
import { Label } from '@moryflow/ui/components/label';
import { Button } from '@moryflow/ui/components/button';
import { Checkbox } from '@moryflow/ui/components/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import type { ModelModality } from '@shared/model-registry';
import type { CustomCapabilities } from './add-model-dialog';
import { DEFAULT_CUSTOM_MODEL_CONTEXT, DEFAULT_CUSTOM_MODEL_OUTPUT } from './constants';

export type EditModelFormData = {
  id: string;
  name: string;
  contextSize: number;
  outputSize: number;
  capabilities: CustomCapabilities;
  inputModalities: ModelModality[];
};

export type EditModelInitialData = {
  id: string;
  name: string;
  isPreset: boolean;
  isCustom?: boolean;
  capabilities?: {
    reasoning: boolean;
    attachment: boolean;
    toolCall?: boolean;
    temperature?: boolean;
  };
  limits: { context: number; output: number };
  inputModalities?: ModelModality[];
};

type EditModelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EditModelFormData) => void;
  initialData: EditModelInitialData | null;
};

/** 默认能力 */
const DEFAULT_CAPABILITIES: CustomCapabilities = {
  attachment: false,
  reasoning: false,
  temperature: true,
  toolCall: true,
};

const MODALITY_VALUES = ['text', 'image', 'audio', 'video', 'pdf'] as const;
const DEFAULT_INPUT_MODALITIES: ModelModality[] = ['text'];

/** 输入模态选项 */
const INPUT_MODALITY_OPTIONS: { value: ModelModality; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
];

/** 能力选项 */
const CAPABILITY_OPTIONS: { key: keyof CustomCapabilities; label: string; description: string }[] =
  [
    {
      key: 'attachment',
      label: 'Multimodal input',
      description: 'Supports images, files, and other attachments',
    },
    {
      key: 'reasoning',
      label: 'Reasoning mode',
      description: 'Supports deep reasoning',
    },
    {
      key: 'temperature',
      label: 'Temperature control',
      description: 'Adjusts generation randomness',
    },
    {
      key: 'toolCall',
      label: 'Tool calling',
      description: 'Supports function calling',
    },
  ];

const editModelSchema = z.object({
  name: z.string().trim().min(1, 'Model name is required'),
  contextSize: z.number().int().min(1000).max(10000000),
  outputSize: z.number().int().min(1000).max(1000000),
  capabilities: z.object({
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    toolCall: z.boolean(),
  }),
  inputModalities: z
    .array(z.enum(MODALITY_VALUES))
    .min(1, 'At least one input type is required')
    .refine((modalities) => modalities.includes('text'), {
      message: 'Text input is required',
    }),
});

type EditModelFormValues = z.infer<typeof editModelSchema>;

const DEFAULT_FORM_VALUES: EditModelFormValues = {
  name: '',
  contextSize: DEFAULT_CUSTOM_MODEL_CONTEXT,
  outputSize: DEFAULT_CUSTOM_MODEL_OUTPUT,
  capabilities: DEFAULT_CAPABILITIES,
  inputModalities: DEFAULT_INPUT_MODALITIES,
};

const parseNumberOrDefault = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toggleModalityValue = (
  current: ModelModality[],
  modality: ModelModality,
  isDisabled: boolean
): ModelModality[] => {
  if (isDisabled) {
    return current;
  }
  if (current.includes(modality)) {
    return current.filter((entry) => entry !== modality);
  }
  return [...current, modality];
};

type ModalitySelectorProps = {
  control: Control<EditModelFormValues>;
};

const ModalitySelector = ({ control }: ModalitySelectorProps) => {
  return (
    <FormField
      control={control}
      name="inputModalities"
      render={({ field }) => (
        <div className="space-y-3">
          <Label>Supported input types</Label>
          <div className="flex flex-wrap gap-2">
            {INPUT_MODALITY_OPTIONS.map((option) => {
              const values = field.value ?? [];
              const isDisabled = option.value === 'text' && values.length === 1;
              return (
                <div
                  key={option.value}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => field.onChange(toggleModalityValue(values, option.value, isDisabled))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      field.onChange(toggleModalityValue(values, option.value, isDisabled));
                    }
                  }}
                  aria-disabled={isDisabled}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
                >
                  <Checkbox
                    checked={values.includes(option.value)}
                    onCheckedChange={() =>
                      field.onChange(toggleModalityValue(values, option.value, isDisabled))
                    }
                    disabled={isDisabled}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select the input types supported by this model. Text is required.
          </p>
          <FormMessage />
        </div>
      )}
    />
  );
};

export const EditModelDialog = ({
  open,
  onOpenChange,
  onSave,
  initialData,
}: EditModelDialogProps) => {
  const form = useForm<EditModelFormValues>({
    resolver: zodResolver(editModelSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });
  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];

  const contextSize = form.watch('contextSize');
  const outputSize = form.watch('outputSize');

  // 当初始数据变化时，重置表单
  useEffect(() => {
    if (!initialData || !open) {
      return;
    }
    form.reset({
      name: initialData.name,
      contextSize: initialData.limits.context,
      outputSize: initialData.limits.output,
      capabilities: {
        attachment: initialData.capabilities?.attachment ?? false,
        reasoning: initialData.capabilities?.reasoning ?? false,
        temperature: initialData.capabilities?.temperature ?? true,
        toolCall: initialData.capabilities?.toolCall ?? true,
      },
      inputModalities: initialData.inputModalities ?? ['text'],
    });
  }, [initialData, open, form]);

  const handleSubmit = form.handleSubmit((values) => {
    if (!initialData) {
      return;
    }

    onSave({
      id: initialData.id,
      name: values.name.trim(),
      contextSize: values.contextSize,
      outputSize: values.outputSize,
      capabilities: values.capabilities,
      inputModalities: values.inputModalities,
    });

    onOpenChange(false);
  });

  if (!initialData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData.isPreset ? 'Customize preset model' : 'Edit custom model'}
          </DialogTitle>
        </DialogHeader>
        <div>
          <Form {...formProviderProps}>
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4 pr-2">
              {/* 模型 ID（只读） */}
              <div className="space-y-2">
                <Label>Model ID</Label>
                <Input value={initialData.id} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {initialData.isPreset
                    ? 'Preset model IDs cannot be changed'
                    : 'Used as the model identifier in API calls'}
                </p>
              </div>

              {/* 模型名称 */}
              <FormField
                control={formControl}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="edit-model-name">
                      Display name <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        id="edit-model-name"
                        placeholder="e.g. GPT-4o (2024-11)"
                        {...field}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSubmit();
                          }
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Shown in the UI</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Token 限制 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={formControl}
                  name="contextSize"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="edit-context-size">Context window</Label>
                      <FormControl>
                        <Input
                          id="edit-context-size"
                          type="number"
                          min={1000}
                          max={10000000}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(
                              parseNumberOrDefault(event.target.value, DEFAULT_CUSTOM_MODEL_CONTEXT)
                            )
                          }
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(contextSize / 1000)}K tokens
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formControl}
                  name="outputSize"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label htmlFor="edit-output-size">Max output</Label>
                      <FormControl>
                        <Input
                          id="edit-output-size"
                          type="number"
                          min={1000}
                          max={1000000}
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(
                              parseNumberOrDefault(event.target.value, DEFAULT_CUSTOM_MODEL_OUTPUT)
                            )
                          }
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(outputSize / 1000)}K tokens
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 模型能力 */}
              <div className="space-y-3">
                <Label>Model capabilities</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CAPABILITY_OPTIONS.map((option) => (
                    <FormField
                      key={option.key}
                      control={formControl}
                      name={`capabilities.${option.key}`}
                      render={({ field }) => (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => field.onChange(!field.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              field.onChange(!field.value);
                            }
                          }}
                          className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={() => field.onChange(!field.value)}
                            onClick={(event) => event.stopPropagation()}
                          />
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">{option.label}</div>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 输入模态 */}
              <ModalitySelector control={formControl} />
            </div>
          </Form>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()}>
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
