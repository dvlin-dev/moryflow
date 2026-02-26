/**
 * [PROPS]: { open, onOpenChange, onAdd, existingModelIds }
 * [EMITS]: onAdd(formData) - 提交添加模型
 * [POS]: 添加自定义模型弹窗，支持从模型数据库搜索和自动填充
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState, type ComponentProps } from 'react';
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
import { searchModels, getModelCount, type ModelInfo } from '@moryflow/model-registry-data';
import type { ModelModality } from '@shared/model-registry';
import { DEFAULT_CUSTOM_MODEL_CONTEXT, DEFAULT_CUSTOM_MODEL_OUTPUT } from './constants';

/** 自定义模型能力 */
export type CustomCapabilities = {
  attachment: boolean;
  reasoning: boolean;
  temperature: boolean;
  toolCall: boolean;
};

export type AddModelFormData = {
  id: string;
  name: string;
  contextSize: number;
  outputSize: number;
  capabilities: CustomCapabilities;
  inputModalities: ModelModality[];
};

type AddModelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: AddModelFormData) => void;
  existingModelIds: string[];
};

const MODALITY_VALUES = ['text', 'image', 'audio', 'video', 'pdf'] as const;

/** 默认值 */
const DEFAULT_CAPABILITIES: CustomCapabilities = {
  attachment: false,
  reasoning: false,
  temperature: true,
  toolCall: true,
};

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

const addModelSchema = z.object({
  id: z.string().trim().min(1, 'Model ID is required'),
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

type AddModelFormValues = z.infer<typeof addModelSchema>;

const DEFAULT_FORM_VALUES: AddModelFormValues = {
  id: '',
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
  control: Control<AddModelFormValues>;
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

export const AddModelDialog = ({
  open,
  onOpenChange,
  onAdd,
  existingModelIds,
}: AddModelDialogProps) => {
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm<AddModelFormValues>({
    resolver: zodResolver(addModelSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });
  const formProviderProps = form as unknown as ComponentProps<typeof Form>;
  const formControl = form.control as unknown as ComponentProps<typeof FormField>['control'];

  // 搜索建议
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    return searchModels({ query: searchQuery, limit: 8, mode: 'chat' });
  }, [searchQuery]);

  const contextSize = form.watch('contextSize');
  const outputSize = form.watch('outputSize');

  const resetForm = () => {
    form.reset(DEFAULT_FORM_VALUES);
    form.clearErrors();
    setSearchQuery('');
    setShowSuggestions(false);
  };

  /** 从模型数据库选择并自动填充 */
  const handleSelectModel = (model: ModelInfo) => {
    form.setValue('id', model.id, { shouldValidate: true });
    form.setValue('name', model.displayName, { shouldValidate: true });
    form.setValue('contextSize', model.maxContextTokens, { shouldValidate: true });
    form.setValue('outputSize', model.maxOutputTokens, { shouldValidate: true });
    form.setValue(
      'capabilities',
      {
        attachment: model.capabilities.vision,
        reasoning: model.capabilities.reasoning,
        temperature: true,
        toolCall: model.capabilities.tools,
      },
      { shouldValidate: true }
    );

    const modalities: ModelModality[] = ['text'];
    if (model.capabilities.vision) modalities.push('image');
    if (model.capabilities.audio) modalities.push('audio');
    if (model.capabilities.pdf) modalities.push('pdf');
    form.setValue('inputModalities', modalities, { shouldValidate: true });

    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSubmit = form.handleSubmit((values) => {
    const trimmedId = values.id.trim();
    const trimmedName = values.name.trim();

    if (existingModelIds.includes(trimmedId)) {
      form.setError('id', { message: 'Model ID already exists' });
      return;
    }

    onAdd({
      id: trimmedId,
      name: trimmedName,
      contextSize: values.contextSize,
      outputSize: values.outputSize,
      capabilities: values.capabilities,
      inputModalities: values.inputModalities,
    });

    resetForm();
    onOpenChange(false);
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add custom model</DialogTitle>
        </DialogHeader>
        <div>
          <Form {...formProviderProps}>
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4 pr-2">
              {/* 模型搜索（快速填充） */}
              <div className="space-y-2">
                <Label>Search model library</Label>
                <div className="relative">
                  <Input
                    placeholder="Search models, e.g. gpt-4o, claude-3..."
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // 延迟关闭，允许点击选项
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                      {suggestions.map((model) => (
                        <div
                          key={model.id}
                          className="flex cursor-pointer items-start justify-between px-3 py-2 hover:bg-muted"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSelectModel(model);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{model.displayName}</div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {model.id}
                            </div>
                          </div>
                          <div className="ml-2 shrink-0 text-right text-xs">
                            <div className="text-muted-foreground">{model.providerName}</div>
                            <div className="text-muted-foreground">
                              {Math.round(model.maxContextTokens / 1000)}K
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Search {getModelCount()} models and click to autofill.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or fill manually</span>
                </div>
              </div>

              {/* 基本信息 */}
              <FormField
                control={formControl}
                name="id"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="add-model-id">
                      Model ID <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        id="add-model-id"
                        placeholder="e.g. gpt-4o-2024-11-20"
                        {...field}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSubmit();
                          }
                        }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Used as the model identifier in API calls
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={formControl}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <Label htmlFor="add-model-name">
                      Model name <span className="text-destructive">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        id="add-model-name"
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
                      <Label htmlFor="add-context-size">Context window</Label>
                      <FormControl>
                        <Input
                          id="add-context-size"
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
                      <Label htmlFor="add-output-size">Max output</Label>
                      <FormControl>
                        <Input
                          id="add-output-size"
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
              Add
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
