/**
 * [PROPS]: ScrapeForm 高级区块 props
 * [EMITS]: onDeviceChange
 * [POS]: Scrape 表单分段 UI（视口/内容/等待）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@moryflow/ui';
import {
  CollapsibleSection,
  type DevicePreset,
  type ScrapeFormValues,
} from '@/features/playground-shared';

interface ScrapeViewportSectionProps {
  form: UseFormReturn<ScrapeFormValues>;
  device: DevicePreset | 'custom';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceChange: (value: string) => void;
  isLoading?: boolean;
}

export function ScrapeViewportSection({
  form,
  device,
  open,
  onOpenChange,
  onDeviceChange,
  isLoading,
}: ScrapeViewportSectionProps) {
  return (
    <CollapsibleSection title="Viewport Settings" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <FormLabel>Device Preset</FormLabel>
            <Select value={device} onValueChange={onDeviceChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop (1280×800)</SelectItem>
                <SelectItem value="tablet">Tablet (768×1024)</SelectItem>
                <SelectItem value="mobile">Mobile (375×667)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Width (px)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={100}
                    max={3840}
                    disabled={isLoading}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      form.setValue('device', 'custom');
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (px)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={100}
                    max={2160}
                    disabled={isLoading}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      form.setValue('device', 'custom');
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap gap-6">
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Mobile User-Agent</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="darkMode"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormLabel className="!mt-0">Dark Mode</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}

interface ScrapeContentSectionProps {
  form: UseFormReturn<ScrapeFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

export function ScrapeContentSection({
  form,
  open,
  onOpenChange,
  isLoading,
}: ScrapeContentSectionProps) {
  return (
    <CollapsibleSection title="Content Options" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="onlyMainContent"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
              </FormControl>
              <FormLabel className="!mt-0">Extract main content only</FormLabel>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="includeTags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Include Tags</FormLabel>
                <FormControl>
                  <Input placeholder="article, main, .content" disabled={isLoading} {...field} />
                </FormControl>
                <FormDescription>CSS selectors, comma separated</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="excludeTags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exclude Tags</FormLabel>
                <FormControl>
                  <Input placeholder="nav, footer, .ads" disabled={isLoading} {...field} />
                </FormControl>
                <FormDescription>Elements to hide/exclude</FormDescription>
              </FormItem>
            )}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}

interface ScrapeWaitSectionProps {
  form: UseFormReturn<ScrapeFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

export function ScrapeWaitSection({ form, open, onOpenChange, isLoading }: ScrapeWaitSectionProps) {
  return (
    <CollapsibleSection title="Wait Options" open={open} onOpenChange={onOpenChange}>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="waitFor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wait For</FormLabel>
              <FormControl>
                <Input placeholder="2000 or .dynamic-content" disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>Milliseconds or CSS selector</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeout (ms)</FormLabel>
              <FormControl>
                <Input type="number" min={1000} max={120000} disabled={isLoading} {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </CollapsibleSection>
  );
}
