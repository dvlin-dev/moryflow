/**
 * [PROPS]: ActionBatchSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Action Batch
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
  Switch,
  Textarea,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserActionBatchValues } from '../../schemas';
import type { BrowserActionBatchResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type ActionBatchSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserActionBatchValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserActionBatchValues) => void;
  result: BrowserActionBatchResponse | null;
};

export function ActionBatchSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ActionBatchSectionProps) {
  return (
    <CollapsibleSection title="Action Batch" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="actionsJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actions JSON (array)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder='[{"type":"click","selector":"@e1"},{"type":"wait","waitFor":{"time":1000}}]'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stopOnError"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Stop On Error</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Execute Batch
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
