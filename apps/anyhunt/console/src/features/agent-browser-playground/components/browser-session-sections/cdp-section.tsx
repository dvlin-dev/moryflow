/**
 * [PROPS]: CdpSectionProps
 * [EMITS]: onConnect
 * [POS]: Browser Session 分区 - CDP Connect
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
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserCdpValues } from '../../schemas';
import type { BrowserSessionInfo } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type CdpSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserCdpValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: BrowserSessionInfo | null;
  onConnect: (values: BrowserCdpValues) => void;
};

export function CdpSection({ apiKey, form, open, onOpenChange, session, onConnect }: CdpSectionProps) {
  return (
    <CollapsibleSection title="CDP Connect" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onConnect)} className="space-y-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="browserbase">browserbase</SelectItem>
                    <SelectItem value="browseruse">browseruse</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wsEndpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WebSocket Endpoint</FormLabel>
                <FormControl>
                  <Input placeholder="ws://localhost:9222/devtools/browser/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="9222" {...field} />
                  </FormControl>
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
          <Button type="submit" disabled={!apiKey}>
            Connect CDP
          </Button>
          {session && <CodeBlock code={formatJson(session)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
