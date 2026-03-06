/**
 * [PROPS]: HeadersSectionProps
 * [EMITS]: onSetHeaders/onClearHeaders
 * [POS]: Browser Session 分区 - Headers
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
  Input,
  Switch,
  Textarea,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserHeadersValues } from '../../schemas';
import type { BrowserHeadersResult } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type HeadersSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserHeadersValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BrowserHeadersResult | null;
  onSetHeaders: (values: BrowserHeadersValues) => void;
  onClearHeaders: (values: BrowserHeadersValues) => void;
};

export function HeadersSection({
  apiKey,
  form,
  open,
  onOpenChange,
  result,
  onSetHeaders,
  onClearHeaders,
}: HeadersSectionProps) {
  return (
    <CollapsibleSection title="Headers" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"x-debug":"1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="clearGlobal"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Clear Global</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSetHeaders)} disabled={!apiKey}>
              Set Headers
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onClearHeaders)}
              disabled={!apiKey}
            >
              Clear Headers
            </Button>
          </div>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
