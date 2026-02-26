/**
 * [PROPS]: SnapshotSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Snapshot
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Input, Switch } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserSnapshotValues } from '../../schemas';
import type { BrowserSnapshotResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type SnapshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserSnapshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserSnapshotValues) => void;
  result: BrowserSnapshotResponse | null;
};

export function SnapshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: SnapshotSectionProps) {
  return (
    <CollapsibleSection title="Snapshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="interactive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Interactive Only</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compact"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Compact</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="maxDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Depth</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="20" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope Selector</FormLabel>
                  <FormControl>
                    <Input placeholder="#content" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKey}>
            Capture Snapshot
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
