/**
 * [PROPS]: ProfileSectionProps
 * [EMITS]: onSave/onLoad
 * [POS]: Browser Session 分区 - Profile
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
  Switch,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserProfileValues } from '../../schemas';
import type { BrowserProfileLoadResult, BrowserProfileSaveResult } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type ProfileSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserProfileValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveResult: BrowserProfileSaveResult | null;
  loadResult: BrowserProfileLoadResult | null;
  onSave: (values: BrowserProfileValues) => void;
  onLoad: (values: BrowserProfileValues) => void;
};

export function ProfileSection({
  apiKey,
  form,
  open,
  onOpenChange,
  saveResult,
  loadResult,
  onSave,
  onLoad,
}: ProfileSectionProps) {
  return (
    <CollapsibleSection title="Profile" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="profileId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile ID (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="profile_123" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="includeSessionStorage"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Include Session Storage</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="loadProfileId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Load Profile ID</FormLabel>
                <FormControl>
                  <Input placeholder="profile_123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={form.handleSubmit(onSave)} disabled={!apiKey}>
              Save Profile
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(onLoad)}
              disabled={!apiKey}
            >
              Load Profile
            </Button>
          </div>
          {saveResult && <CodeBlock code={formatJson(saveResult)} language="json" />}
          {loadResult && <CodeBlock code={formatJson(loadResult)} language="json" />}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
