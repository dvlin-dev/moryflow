/**
 * [PROPS]: ScreenshotSectionProps
 * [EMITS]: onSubmit
 * [POS]: Browser Session 分区 - Screenshot
 */

import { useWatch, type UseFormReturn } from 'react-hook-form';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import type { BrowserScreenshotValues } from '../../schemas';
import type { BrowserScreenshotResponse } from '../../types';
import { CollapsibleSection } from '../../../playground-shared/components/collapsible-section';

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

type ScreenshotSectionProps = {
  apiKey: string;
  form: UseFormReturn<BrowserScreenshotValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BrowserScreenshotValues) => void;
  result: BrowserScreenshotResponse | null;
};

export function ScreenshotSection({
  apiKey,
  form,
  open,
  onOpenChange,
  onSubmit,
  result,
}: ScreenshotSectionProps) {
  const format = useWatch({ control: form.control, name: 'format' });
  const isJpeg = format === 'jpeg';

  return (
    <CollapsibleSection title="Screenshot" open={open} onOpenChange={onOpenChange}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="selector"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selector (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="#main" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="png" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="png">png</SelectItem>
                      <SelectItem value="jpeg">jpeg</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="80" disabled={!isJpeg} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullPage"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Full Page</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={!apiKey}>
            Capture Screenshot
          </Button>
          {result && (
            <div className="space-y-2">
              <CodeBlock code={formatJson(result)} language="json" />
              <img
                src={`data:${result.mimeType};base64,${result.data}`}
                alt="Screenshot"
                className="max-h-64 rounded-md border border-border-muted"
              />
            </div>
          )}
        </form>
      </Form>
    </CollapsibleSection>
  );
}
