/**
 * [PROPS]: DeltaSnapshotSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Delta Snapshot
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Switch } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserDeltaSnapshotValues } from '../../schemas';
import type { BrowserDeltaSnapshotResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type DeltaSnapshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserDeltaSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserDeltaSnapshotValues) => void;
  result: BrowserDeltaSnapshotResponse | null;
};

export function DeltaSnapshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: DeltaSnapshotSectionProps) {
  return (
    <CollapsibleSection title="Delta Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="delta"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Delta Mode</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Capture Delta
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
