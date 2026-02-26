import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TIER_OPTIONS } from '@/constants/tier';
import type { CreateModelFormData } from '@/lib/validations/model';
import type { AiProvider } from '@/types/api';
import type { UseFormReturn } from 'react-hook-form';

interface ModelBasicFieldsSectionProps {
  form: UseFormReturn<CreateModelFormData>;
  providers: AiProvider[];
  isEditing: boolean;
}

export function ModelBasicFieldsSection({
  form,
  providers,
  isEditing,
}: ModelBasicFieldsSectionProps) {
  return (
    <>
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
    </>
  );
}
