/**
 * [PROPS]: StorageSectionProps
 * [EMITS]: onExport/onImport/onClear
 * [POS]: Browser Session 分区 - Storage
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserStorageValues } from '../../schemas';
import type { BrowserStorageExportResult } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type StorageSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserStorageValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportResult: BrowserStorageExportResult | null;
  onExport: (values: BrowserStorageValues) => void;
  onImport: (values: BrowserStorageValues) => void;
  onClear: () => void;
};

export function StorageSection({
  apiKey,
  form,
  open,
  onOpenChange,
  exportResult,
  onExport,
  onImport,
  onClear,
}: StorageSectionProps) {
  return (
    <CollapsibleSection title="Storage" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="exportOptionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Export Options JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"include":{"cookies":true}}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="importDataJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Import Data JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"cookies":[]}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onExport)} disabled={!apiKey}>
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onImport)}
              disabled={!apiKey}
            >
              Import
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKey}>
              Clear
            </Button>
          </div>
          {exportResult && <CodeBlock code={formatJson(exportResult)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
