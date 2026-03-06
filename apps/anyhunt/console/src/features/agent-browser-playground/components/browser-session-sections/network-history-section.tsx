/**
 * [PROPS]: NetworkHistorySectionProps
 * [EMITS]: onFetch/onClear
 * [POS]: Browser Session 分区 - Network History
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Input } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserNetworkHistoryValues } from '../../schemas';
import type { BrowserNetworkRequestRecord } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type NetworkHistorySectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserNetworkHistoryValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: BrowserNetworkRequestRecord[] | null;
  onFetch: (values: BrowserNetworkHistoryValues) => void;
  onClear: () => void;
};

export function NetworkHistorySection({
  apiKey,
  form,
  open,
  onOpenChange,
  history,
  onFetch,
  onClear,
}: NetworkHistorySectionProps) {
  return (
    <CollapsibleSection title="Network History" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urlFilter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Filter</FormLabel>
                  <FormControl>
                    <Input placeholder="*.png" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onFetch)} disabled={!apiKey}>
              Get History
            </Button>
            <Button type="button" variant="ghost" onClick={onClear} disabled={!apiKey}>
              Clear History
            </Button>
          </div>
          {history && <CodeBlock code={formatJson(history)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
