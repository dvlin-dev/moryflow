/**
 * [PROPS]: { open, onOpenChange, model, providers }
 * [EMITS]: 提交创建/更新模型
 * [POS]: Model 表单对话框，支持从模型数据库搜索和自动填充
 */

import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { createModelSchema, type CreateModelFormData } from '@/lib/validations/model';
import { TIER_OPTIONS } from '@/constants/tier';
import { useCreateModel, useUpdateModel } from '../hooks';
import { parseCapabilities } from '../utils';
import { searchModels, getModelCount, type ModelInfo } from '@anyhunt/model-registry-data';
import type { AiModel, AiProvider, UserTier, ReasoningEffort } from '@/types/api';

/** 思考强度选项 */
const REASONING_EFFORT_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: 'xhigh', label: '极高 (xhigh)' },
  { value: 'high', label: '高 (high)' },
  { value: 'medium', label: '中 (medium)' },
  { value: 'low', label: '低 (low)' },
  { value: 'minimal', label: '最小 (minimal)' },
  { value: 'none', label: '无 (none)' },
];

/** 验证 JSON 字符串 */
function isValidJson(str: string): boolean {
  if (!str.trim()) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AiModel;
  providers: AiProvider[];
}

type ModelFormDialogContentProps = Omit<ModelFormDialogProps, 'open'>;

function ModelFormDialogContent({ onOpenChange, model, providers }: ModelFormDialogContentProps) {
  const isEditing = !!model;
  const caps = model ? parseCapabilities(model.capabilitiesJson) : null;

  // 搜索相关状态
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // rawConfig JSON 编辑状态
  const [rawConfigText, setRawConfigText] = useState(() => {
    const rawConfig = caps?.reasoning?.rawConfig;
    return rawConfig ? JSON.stringify(rawConfig, null, 2) : '';
  });
  const [rawConfigError, setRawConfigError] = useState(false);

  // 搜索建议
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    return searchModels({ query: searchQuery, limit: 10, mode: 'chat' });
  }, [searchQuery]);

  const form = useForm<CreateModelFormData>({
    resolver: zodResolver(createModelSchema),
    defaultValues: {
      providerId: model?.providerId || providers[0]?.id || '',
      modelId: model?.modelId || '',
      upstreamId: model?.upstreamId || '',
      displayName: model?.displayName || '',
      enabled: model?.enabled ?? true,
      inputTokenPrice: model?.inputTokenPrice ?? 0,
      outputTokenPrice: model?.outputTokenPrice ?? 0,
      minTier: (model?.minTier as UserTier) || 'free',
      maxContextTokens: model?.maxContextTokens ?? 128000,
      maxOutputTokens: model?.maxOutputTokens ?? 4096,
      capabilities: {
        vision: caps?.vision ?? false,
        tools: caps?.tools ?? false,
        json: caps?.json ?? false,
      },
      reasoning: caps?.reasoning ?? { enabled: false, effort: 'medium' },
      sortOrder: model?.sortOrder ?? 0,
    },
  });
  const reasoningEnabled = useWatch({
    control: form.control,
    name: 'reasoning.enabled',
  });

  const createMutation = useCreateModel();
  const updateMutation = useUpdateModel();
  const isPending = createMutation.isPending || updateMutation.isPending;

  /** 从模型数据库选择并自动填充 */
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
    // 如果模型支持 reasoning，预填充配置
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
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? '编辑 Model' : '添加 Model'}</DialogTitle>
        <DialogDescription>{isEditing ? '修改 Model 配置' : '添加新的 AI 模型'}</DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* 模型搜索（快速填充） */}
          {!isEditing && (
            <div className="space-y-2">
              <FormLabel>从模型库快速填充</FormLabel>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="mr-2 h-4 w-4" />
                    搜索模型（{getModelCount()} 个可用）...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="输入模型名称..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchQuery.length < 2 ? '请输入至少 2 个字符' : '未找到匹配的模型'}
                      </CommandEmpty>
                      {suggestions.map((modelInfo) => (
                        <CommandItem
                          key={modelInfo.id}
                          value={modelInfo.id}
                          onSelect={() => handleSelectModel(modelInfo)}
                        >
                          <div className="flex justify-between w-full">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{modelInfo.displayName}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {modelInfo.id}
                              </div>
                            </div>
                            <div className="text-right text-xs ml-2 shrink-0">
                              <div>{modelInfo.providerName}</div>
                              <div className="text-muted-foreground">
                                ${modelInfo.inputPricePerMillion.toFixed(2)} / $
                                {modelInfo.outputPricePerMillion.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择 Provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
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
              name="minTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最低等级</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIER_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model ID（对外）</FormLabel>
                  <FormControl>
                    <Input placeholder="gpt-4o-mini" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="upstreamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>上游 ID（API 调用）</FormLabel>
                  <FormControl>
                    <Input placeholder="gpt-4o-mini-2024-07-18" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>显示名称</FormLabel>
                <FormControl>
                  <Input placeholder="GPT-4o Mini" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="inputTokenPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>输入价格（$/1M tokens）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outputTokenPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>输出价格（$/1M tokens）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="maxContextTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大上下文 Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxOutputTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大输出 Tokens</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 py-2">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">启用</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capabilities.vision"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">视觉</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capabilities.tools"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">工具调用</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capabilities.json"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">JSON 模式</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel className="!mt-0">排序</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="w-20"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* 深度推理配置 */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">深度推理 (Reasoning)</h4>
                <p className="text-xs text-muted-foreground">
                  启用后模型将具备思考能力，输出 thinking 内容
                </p>
              </div>
              <FormField
                control={form.control}
                name="reasoning.enabled"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {reasoningEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="reasoning.effort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>思考强度</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'medium'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REASONING_EFFORT_OPTIONS.map((option) => (
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

                <FormField
                  control={form.control}
                  name="reasoning.maxTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>思考 Token 预算</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="可选"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? parseInt(val) : undefined);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasoning.exclude"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 col-span-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">在响应中排除思考内容</FormLabel>
                    </FormItem>
                  )}
                />

                {/* 高级选项：原生配置覆盖 */}
                <Collapsible className="col-span-2">
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-4 w-4" />
                    高级选项
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <FormField
                      control={form.control}
                      name="reasoning.rawConfig"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>原生配置（JSON）</FormLabel>
                          <FormDescription>
                            直接透传给
                            API，会覆盖上方的通用配置。不同提供商格式不同，请参考对应文档。
                          </FormDescription>
                          <FormControl>
                            <Textarea
                              placeholder='{"reasoning": {"effort": "high"}}'
                              className={`font-mono text-sm ${rawConfigError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                              rows={4}
                              value={rawConfigText}
                              onChange={(e) => {
                                const text = e.target.value;
                                setRawConfigText(text);
                                if (isValidJson(text)) {
                                  setRawConfigError(false);
                                  field.onChange(text.trim() ? JSON.parse(text) : undefined);
                                } else {
                                  setRawConfigError(true);
                                }
                              }}
                            />
                          </FormControl>
                          {rawConfigError && (
                            <p className="text-sm text-destructive">无效的 JSON 格式</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

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
