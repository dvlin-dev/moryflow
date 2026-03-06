/**
 * [PROPS]: FlowRunnerFormProps
 * [EMITS]: onSubmit
 * [POS]: Flow Runner 表单输入区
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
import type { FlowRunnerValues } from '../schemas';
import { getRunButtonLabel } from './flow-runner-helpers';

type FlowRunnerFormProps = {
  apiKey: string;
  form: UseFormReturn<FlowRunnerValues>;
  running: boolean;
  onSubmit: (values: FlowRunnerValues) => void;
};

export function FlowRunnerForm({ apiKey, form, running, onSubmit }: FlowRunnerFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="targetUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxCredits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Credits</FormLabel>
              <FormControl>
                <Input type="number" placeholder="200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Agent Prompt</FormLabel>
              <FormControl>
                <Input placeholder="Describe the target task" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="schemaJson"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Output Schema (JSON)</FormLabel>
              <FormControl>
                <Input
                  placeholder='{"title":{"type":"string"},"price":{"type":"number"}}'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={running || !apiKey}>
            {getRunButtonLabel(running)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
