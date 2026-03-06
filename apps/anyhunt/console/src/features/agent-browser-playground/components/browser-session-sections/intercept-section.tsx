/**
 * [PROPS]: InterceptSectionProps
 * [EMITS]: onSetRules/onAddRule/onRemoveRule/onClearRules/onListRules
 * [POS]: Browser Session 分区 - Network Intercept
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
  Textarea,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserInterceptValues } from '../../schemas';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type InterceptSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserInterceptValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: unknown[] | null;
  onSetRules: (values: BrowserInterceptValues) => void;
  onAddRule: (values: BrowserInterceptValues) => void;
  onRemoveRule: (values: BrowserInterceptValues) => void;
  onClearRules: () => void;
  onListRules: () => void;
};

export function InterceptSection({
  apiKey,
  form,
  open,
  onOpenChange,
  rules,
  onSetRules,
  onAddRule,
  onRemoveRule,
  onClearRules,
  onListRules,
}: InterceptSectionProps) {
  return (
    <CollapsibleSection title="Network Intercept" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="rulesJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rules JSON (array)</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="[]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleJson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Single Rule JSON</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder='{"urlPattern":"*"}' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ruleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rule ID</FormLabel>
                <FormControl>
                  <Input placeholder="rule_123" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSetRules)} disabled={!apiKey}>
              Set Rules
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onAddRule)}
              disabled={!apiKey}
            >
              Add Rule
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onRemoveRule)}
              disabled={!apiKey}
            >
              Remove Rule
            </Button>
            <Button type="button" variant="ghost" onClick={onClearRules} disabled={!apiKey}>
              Clear Rules
            </Button>
            <Button type="button" variant="outline" onClick={onListRules} disabled={!apiKey}>
              List Rules
            </Button>
          </div>
          {rules && <CodeBlock code={formatJson(rules)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
