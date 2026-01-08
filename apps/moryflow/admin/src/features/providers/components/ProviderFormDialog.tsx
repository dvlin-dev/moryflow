/**
 * Provider 表单对话框
 */
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { createProviderSchema, type CreateProviderFormData } from '@/lib/validations/provider';
import { useCreateProvider, useUpdateProvider } from '../hooks';
import type { AiProvider, PresetProvider } from '@/types/api';

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AiProvider;
  presets: PresetProvider[];
}

export function ProviderFormDialog({
  open,
  onOpenChange,
  provider,
  presets,
}: ProviderFormDialogProps) {
  const isEditing = !!provider;

  const form = useForm<CreateProviderFormData>({
    resolver: zodResolver(createProviderSchema),
    defaultValues: {
      providerType: provider?.providerType || presets[0]?.id || 'openai',
      name: provider?.name || '',
      apiKey: provider?.apiKey || '',
      baseUrl: provider?.baseUrl || '',
      enabled: provider?.enabled ?? true,
      sortOrder: provider?.sortOrder ?? 0,
    },
  });

  // 当 provider 变化时重置表单
  useEffect(() => {
    if (open) {
      form.reset({
        providerType: provider?.providerType || presets[0]?.id || 'openai',
        name: provider?.name || '',
        apiKey: provider?.apiKey || '',
        baseUrl: provider?.baseUrl || '',
        enabled: provider?.enabled ?? true,
        sortOrder: provider?.sortOrder ?? 0,
      });
    }
  }, [open, provider, presets, form]);

  const createMutation = useCreateProvider();
  const updateMutation = useUpdateProvider();

  const providerType = useWatch({ control: form.control, name: 'providerType' });
  const selectedPreset = presets.find((p) => p.id === providerType);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (data: CreateProviderFormData) => {
    if (isEditing && provider) {
      updateMutation.mutate(
        {
          id: provider.id,
          data: {
            name: data.name,
            apiKey: data.apiKey,
            baseUrl: data.baseUrl || null,
            enabled: data.enabled,
            sortOrder: data.sortOrder,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '修改 Provider 配置' : '添加新的 AI 服务提供商'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPreset?.description && (
                    <FormDescription>{selectedPreset.description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：OpenAI 官方" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="sk-..." className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL（可选）</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={selectedPreset?.defaultBaseUrl || '使用默认 URL'}
                      {...field}
                    />
                  </FormControl>
                  {selectedPreset?.defaultBaseUrl && (
                    <FormDescription>默认：{selectedPreset.defaultBaseUrl}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
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
                name="sortOrder"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel className="!mt-0">排序权重</FormLabel>
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
    </Dialog>
  );
}
