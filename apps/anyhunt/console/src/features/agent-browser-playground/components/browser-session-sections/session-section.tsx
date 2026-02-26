/**
 * [PROPS]: SessionSectionProps
 * [EMITS]: onCreate/onStatus/onClose
 * [POS]: Browser Session 分区 - Session Lifecycle
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
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserSessionValues } from '../../schemas';
import type { BrowserSessionInfo } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';
import { SessionContextFields } from './session-context-fields';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type SessionSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserSessionValues>;
  sessionInfo: BrowserSessionInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: BrowserSessionValues) => void;
  onStatus: () => void;
  onClose: () => void;
};

export function SessionSection({
  apiKey,
  form,
  sessionInfo,
  open,
  onOpenChange,
  onCreate,
  onStatus,
  onClose,
}: SessionSectionProps) {
  return (
    <CollapsibleSection title="Session" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
          <FormField
            control={form.control}
            name="sessionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session ID</FormLabel>
                <FormControl>
                  <Input placeholder="session_xxx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SessionContextFields form={form} />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!apiKey}>
              Create Session
            </Button>
            <Button type="button" variant="outline" onClick={onStatus} disabled={!apiKey}>
              Get Status
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={!apiKey}>
              Close Session
            </Button>
          </div>

          {sessionInfo && <CodeBlock code={formatJson(sessionInfo)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
