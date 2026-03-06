import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { CreateModelFormData } from '@/lib/validations/model';
import { ChevronDown } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { REASONING_EFFORT_OPTIONS } from './constants';
import { parseRawConfigText } from './raw-config';

interface ModelReasoningSectionProps {
  form: UseFormReturn<CreateModelFormData>;
  reasoningEnabled: boolean;
  rawConfigText: string;
  rawConfigError: boolean;
  onRawConfigTextChange: (value: string) => void;
  onRawConfigErrorChange: (hasError: boolean) => void;
}

export function ModelReasoningSection({
  form,
  reasoningEnabled,
  rawConfigText,
  rawConfigError,
  onRawConfigTextChange,
  onRawConfigErrorChange,
}: ModelReasoningSectionProps) {
  return (
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
                      直接透传给 API，会覆盖上方的通用配置。不同提供商格式不同，请参考对应文档。
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder='{"reasoning": {"effort": "high"}}'
                        className={`font-mono text-sm ${rawConfigError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        rows={4}
                        value={rawConfigText}
                        onChange={(e) => {
                          const text = e.target.value;
                          onRawConfigTextChange(text);

                          const parsedResult = parseRawConfigText(text);
                          onRawConfigErrorChange(parsedResult.hasError);
                          if (!parsedResult.hasError) {
                            field.onChange(parsedResult.value);
                          }
                        }}
                      />
                    </FormControl>
                    {rawConfigError && <p className="text-sm text-destructive">无效的 JSON 格式</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
