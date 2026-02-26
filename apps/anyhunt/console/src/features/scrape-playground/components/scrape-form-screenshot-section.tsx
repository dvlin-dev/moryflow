/**
 * [PROPS]: form, open, onOpenChange, isLoading
 * [EMITS]: form field onChange
 * [POS]: Scrape 表单截图选项片段
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
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
import { CollapsibleSection, type ScrapeFormValues } from '@/features/playground-shared';

interface ScrapeScreenshotSectionProps {
  form: UseFormReturn<ScrapeFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

export function ScrapeScreenshotSection({
  form,
  open,
  onOpenChange,
  isLoading,
}: ScrapeScreenshotSectionProps) {
  return (
    <CollapsibleSection title="Screenshot Options" open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="screenshotFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="screenshotQuality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quality (1-100)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={100} disabled={isLoading} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="screenshotResponse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Response Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL (CDN Link)</SelectItem>
                    <SelectItem value="base64">Base64</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="screenshotFullPage"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
              </FormControl>
              <FormLabel className="!mt-0">Full Page Screenshot</FormLabel>
            </FormItem>
          )}
        />
      </div>
    </CollapsibleSection>
  );
}
