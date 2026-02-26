/**
 * [PROPS]: ActionSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Action
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
import type { BrowserActionValues } from '../../schemas';
import type { BrowserActionResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type ActionSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserActionValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserActionValues) => void;
  result: BrowserActionResponse | null;
};

export function ActionSection({ apiKey, form, open, onOpenChange, onSubmit, result }: ActionSectionProps) {
  return (
    <CollapsibleSection title="Action" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="actionJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action JSON</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder='{"type":"click","selector":"@e1"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={!apiKey}>
            Execute Action
          </Button>
          {result && <CodeBlock code={formatJson(result)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
