/**
 * [PROPS]: TabsSectionProps
 * [EMITS]: onCreateTab/onListTabs/onSwitchTab/onCloseTab/onDialogHistory
 * [POS]: Browser Session 分区 - Tabs
 */

import type { UseFormReturn } from 'react-hook-form';
import { Button, Form, FormControl, FormField, FormItem, FormLabel, Input } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserTabsValues } from '../../schemas';
import type { BrowserTabInfo } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type TabsSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserTabsValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: BrowserTabInfo[] | null;
  dialogHistory: unknown[];
  onCreateTab: () => void;
  onListTabs: () => void;
  onSwitchTab: (values: BrowserTabsValues) => void;
  onCloseTab: (values: BrowserTabsValues) => void;
  onDialogHistory: () => void;
};

export function TabsSection({
  apiKey,
  form,
  open,
  onOpenChange,
  tabs,
  dialogHistory,
  onCreateTab,
  onListTabs,
  onSwitchTab,
  onCloseTab,
  onDialogHistory,
}: TabsSectionProps) {
  return (
    <CollapsibleSection title="Tabs" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="tabIndex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tab Index</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onCreateTab} disabled={!apiKey}>
              Create Tab
            </Button>
            <Button type="button" variant="outline" onClick={onListTabs} disabled={!apiKey}>
              List Tabs
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onSwitchTab)}
              disabled={!apiKey}
            >
              Activate Tab
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(onCloseTab)}
              disabled={!apiKey}
            >
              Close Tab
            </Button>
          </div>
          {tabs && <CodeBlock code={formatJson(tabs)} language="json" />}
          <Button type="button" variant="outline" onClick={onDialogHistory}>
            Get Dialog History
          </Button>
          {dialogHistory.length > 0 && (
            <CodeBlock code={formatJson(dialogHistory)} language="json" />
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
