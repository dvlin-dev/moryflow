/**
 * [PROPS]: ScrapeForm 基础区块 props
 * [EMITS]: onFormatToggle
 * [POS]: Scrape 表单分段 UI（URL/格式）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Loader, Search } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import {
  Button,
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@moryflow/ui';
import {
  CollapsibleSection,
  type ScrapeFormat,
  type ScrapeFormValues,
} from '@/features/playground-shared';

const FORMAT_OPTIONS: { value: ScrapeFormat; label: string; description: string }[] = [
  { value: 'markdown', label: 'Markdown', description: 'Clean readable text' },
  { value: 'html', label: 'HTML', description: 'Processed HTML' },
  { value: 'rawHtml', label: 'Raw HTML', description: 'Original HTML' },
  { value: 'links', label: 'Links', description: 'All page links' },
  { value: 'screenshot', label: 'Screenshot', description: 'Page image' },
  { value: 'pdf', label: 'PDF', description: 'PDF document' },
];

function ScrapeSubmitIcon({ isLoading }: { isLoading?: boolean }) {
  if (isLoading) {
    return <Loader className="h-4 w-4 animate-spin" />;
  }

  return <Search className="h-4 w-4" />;
}

interface ScrapeUrlFieldProps {
  form: UseFormReturn<ScrapeFormValues>;
  canSubmit: boolean;
  isLoading?: boolean;
}

export function ScrapeUrlField({ form, canSubmit, isLoading }: ScrapeUrlFieldProps) {
  return (
    <FormField
      control={form.control}
      name="url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Target URL</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                type="url"
                placeholder="https://example.com"
                className="flex-1"
                disabled={isLoading}
                {...field}
              />
            </FormControl>
            <Button type="submit" disabled={!canSubmit}>
              <ScrapeSubmitIcon isLoading={isLoading} />
              <span className="ml-2">Scrape</span>
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ScrapeFormatSectionProps {
  form: UseFormReturn<ScrapeFormValues>;
  formats: ScrapeFormat[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormatToggle: (format: ScrapeFormat) => void;
  isLoading?: boolean;
}

export function ScrapeFormatSection({
  form,
  formats,
  open,
  onOpenChange,
  onFormatToggle,
  isLoading,
}: ScrapeFormatSectionProps) {
  return (
    <CollapsibleSection title="Output Formats" open={open} onOpenChange={onOpenChange}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FORMAT_OPTIONS.map((format) => (
          <label
            key={format.value}
            className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={formats.includes(format.value)}
              onCheckedChange={() => onFormatToggle(format.value)}
              disabled={isLoading}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{format.label}</div>
              <div className="text-xs text-muted-foreground">{format.description}</div>
            </div>
          </label>
        ))}
      </div>
      {form.formState.errors.formats && (
        <p className="text-sm text-destructive mt-2">{form.formState.errors.formats.message}</p>
      )}
    </CollapsibleSection>
  );
}
