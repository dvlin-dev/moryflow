/**
 * [PROPS]: OpenUrlSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Open URL
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserOpenValues } from '../../schemas';
import type { BrowserOpenResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type OpenUrlSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserOpenValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserOpenValues) => void;
  result: BrowserOpenResponse | null;
};

export function OpenUrlSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: OpenUrlSectionProps) {
  return (
    <CollapsibleSection title="Open URL" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="waitUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait Until</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="load">load</SelectItem>
                      <SelectItem value="domcontentloaded">domcontentloaded</SelectItem>
                      <SelectItem value="networkidle">networkidle</SelectItem>
                      <SelectItem value="commit">commit</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input type="number" placeholder="30000" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="headersJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoped Headers JSON</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder='{"x-session":"demo"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Open URL
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
