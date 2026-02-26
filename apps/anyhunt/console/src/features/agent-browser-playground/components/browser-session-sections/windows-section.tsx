/**
 * [PROPS]: WindowsSectionProps
 * [EMITS]: onCreateWindow/onListWindows/onSwitchWindow/onCloseWindow
 * [POS]: Browser Session 分区 - Windows
 */

import type { UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserWindowsValues } from '../../schemas';
import type { BrowserWindowInfo } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';
import { WindowsContextFields } from './windows-context-fields';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type WindowsSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserWindowsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windows: BrowserWindowInfo[] | null;
  onCreateWindow: (values: BrowserWindowsValues) => void;
  onListWindows: () => void;
  onSwitchWindow: (values: BrowserWindowsValues) => void;
  onCloseWindow: (values: BrowserWindowsValues) => void;
};

export function WindowsSection({
  apiKey,
  form,
  open,
  onOpenChange,
  windows,
  onCreateWindow,
  onListWindows,
  onSwitchWindow,
  onCloseWindow,
}: WindowsSectionProps) {
  return (
    <CollapsibleSection title="Windows" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="windowIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Window Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <WindowsContextFields form={form} />

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onCreateWindow)} disabled={!apiKey}>
              Create Window
            </Button>
            <Button type="button" variant="outline" onClick={onListWindows} disabled={!apiKey}>
              List Windows
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchWindow)}
              disabled={!apiKey}
            >
              Activate Window
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseWindow)}
              disabled={!apiKey}
            >
              Close Window
            </Button>
          </div>

          {windows && <CodeBlock code={formatJson(windows)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
