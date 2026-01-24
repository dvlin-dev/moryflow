/**
 * [PROPS]: { open, onOpenChange, onAdd, existingModelIds }
 * [EMITS]: onAdd(formData) - 提交添加模型
 * [POS]: 添加自定义模型弹窗，支持从模型数据库搜索和自动填充
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@anyhunt/ui/components/dialog';
import { Input } from '@anyhunt/ui/components/input';
import { Label } from '@anyhunt/ui/components/label';
import { Button } from '@anyhunt/ui/components/button';
import { Checkbox } from '@anyhunt/ui/components/checkbox';
import { searchModels, getModelCount, type ModelInfo } from '@anyhunt/model-registry-data';
import type { ModelModality } from '@shared/model-registry';

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

export const AddModelDialog = ({
  open,
  onOpenChange,
  onAdd,
  existingModelIds,
}: AddModelDialogProps) => {
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [contextSize, setContextSize] = useState(128000);
  const [outputSize, setOutputSize] = useState(16384);
  const [capabilities, setCapabilities] = useState<CustomCapabilities>(DEFAULT_CAPABILITIES);
  const [inputModalities, setInputModalities] = useState<ModelModality[]>(DEFAULT_INPUT_MODALITIES);
  const [error, setError] = useState<string | null>(null);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 搜索建议
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    return searchModels({ query: searchQuery, limit: 8, mode: 'chat' });
  }, [searchQuery]);

  const resetForm = () => {
    setModelId('');
    setModelName('');
    setContextSize(128000);
    setOutputSize(16384);
    setCapabilities(DEFAULT_CAPABILITIES);
    setInputModalities(DEFAULT_INPUT_MODALITIES);
    setError(null);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  /** 从模型数据库选择并自动填充 */
  const handleSelectModel = (model: ModelInfo) => {
    setModelId(model.id);
    setModelName(model.displayName);
    setContextSize(model.maxContextTokens);
    setOutputSize(model.maxOutputTokens);
    setCapabilities({
      attachment: model.capabilities.vision,
      reasoning: model.capabilities.reasoning,
      temperature: true,
      toolCall: model.capabilities.tools,
    });

    const modalities: ModelModality[] = ['text'];
    if (model.capabilities.vision) modalities.push('image');
    if (model.capabilities.audio) modalities.push('audio');
    if (model.capabilities.pdf) modalities.push('pdf');
    setInputModalities(modalities);

    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    setError(null);

    const trimmedId = modelId.trim();
    const trimmedName = modelName.trim();

    if (!trimmedId) {
      setError('Model ID is required');
      return;
    }
    if (!trimmedName) {
      setError('Model name is required');
      return;
    }
    if (existingModelIds.includes(trimmedId)) {
      setError('Model ID already exists');
      return;
    }

    onAdd({
      id: trimmedId,
      name: trimmedName,
      contextSize,
      outputSize,
      capabilities,
      inputModalities,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const toggleCapability = (key: keyof CustomCapabilities) => {
    setCapabilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleModality = (modality: ModelModality) => {
    setInputModalities((prev) => {
      if (prev.includes(modality)) {
        if (modality === 'text' && prev.length === 1) return prev;
        return prev.filter((m) => m !== modality);
      }
      return [...prev, modality];
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add custom model</DialogTitle>
        </DialogHeader>
        <div>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* 模型搜索（快速填充） */}
            <div className="space-y-2">
              <Label>Search model library</Label>
              <div className="relative">
                <Input
                  placeholder="Search models, e.g. gpt-4o, claude-3..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // 延迟关闭，允许点击选项
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((model) => (
                      <div
                        key={model.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-start"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectModel(model);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{model.displayName}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {model.id}
                          </div>
                        </div>
                        <div className="text-xs text-right ml-2 shrink-0">
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
            <div className="space-y-2">
              <Label htmlFor="add-model-id">
                Model ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-model-id"
                placeholder="e.g. gpt-4o-2024-11-20"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Used as the model identifier in API calls
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-model-name">
                Model name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-model-name"
                placeholder="e.g. GPT-4o (2024-11)"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">Shown in the UI</p>
            </div>

            {/* Token 限制 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-context-size">Context window</Label>
                <Input
                  id="add-context-size"
                  type="number"
                  min={1000}
                  max={10000000}
                  value={contextSize}
                  onChange={(e) => setContextSize(parseInt(e.target.value) || 128000)}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round(contextSize / 1000)}K tokens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-output-size">Max output</Label>
                <Input
                  id="add-output-size"
                  type="number"
                  min={1000}
                  max={1000000}
                  value={outputSize}
                  onChange={(e) => setOutputSize(parseInt(e.target.value) || 16384)}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round(outputSize / 1000)}K tokens
                </p>
              </div>
            </div>

            {/* 模型能力 */}
            <div className="space-y-3">
              <Label>Model capabilities</Label>
              <div className="grid grid-cols-2 gap-3">
                {CAPABILITY_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleCapability(option.key)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleCapability(option.key)}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={capabilities[option.key]}
                      onCheckedChange={() => toggleCapability(option.key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{option.label}</div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 输入模态 */}
            <div className="space-y-3">
              <Label>Supported input types</Label>
              <div className="flex flex-wrap gap-2">
                {INPUT_MODALITY_OPTIONS.map((option) => {
                  const isDisabled = option.value === 'text' && inputModalities.length === 1;
                  return (
                    <div
                      key={option.value}
                      role="button"
                      tabIndex={isDisabled ? -1 : 0}
                      onClick={() => !isDisabled && toggleModality(option.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && !isDisabled && toggleModality(option.value)
                      }
                      aria-disabled={isDisabled}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent"
                    >
                      <Checkbox
                        checked={inputModalities.includes(option.value)}
                        onCheckedChange={() => toggleModality(option.value)}
                        disabled={isDisabled}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Select the input types supported by this model. Text is required.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              Add
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
