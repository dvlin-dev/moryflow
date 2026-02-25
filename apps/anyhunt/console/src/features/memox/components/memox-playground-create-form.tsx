/**
 * [PROPS]: form, isSubmitting, hasApiKey, onSubmit
 * [EMITS]: onSubmit(values)
 * [POS]: Memox Playground 创建记忆表单
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { UseFormReturn } from 'react-hook-form';
import { Loader, Plus } from 'lucide-react';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
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
  Switch,
  Textarea,
} from '@moryflow/ui';
import type { CreateMemoryFormInput, CreateMemoryFormValues } from '../playground-schemas';

interface MemoxPlaygroundCreateFormProps {
  form: UseFormReturn<CreateMemoryFormInput, unknown, CreateMemoryFormValues>;
  isSubmitting: boolean;
  hasApiKey: boolean;
  onSubmit: (values: CreateMemoryFormValues) => void;
}

function CreateSubmitButton({
  isSubmitting,
}: {
  isSubmitting: boolean;
}) {
  if (isSubmitting) {
    return (
      <>
        <Loader className="h-4 w-4 animate-spin mr-2" />
        Creating...
      </>
    );
  }

  return (
    <>
      <Plus className="h-4 w-4 mr-2" />
      Create Memory
    </>
  );
}

export function MemoxPlaygroundCreateForm({
  form,
  isSubmitting,
  hasApiKey,
  onSubmit,
}: MemoxPlaygroundCreateFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User ID *</FormLabel>
              <FormControl>
                <Input placeholder="user-123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message *</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter the user message..." rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="agent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent ID</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="app_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App ID</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="run_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Run ID</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="output_format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Output Format</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1.0">v1.0</SelectItem>
                      <SelectItem value="v1.1">v1.1</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="metadata"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata (JSON)</FormLabel>
              <FormControl>
                <Textarea placeholder='{"source":"playground"}' rows={3} {...field} />
              </FormControl>
              <FormDescription>JSON object for memory metadata</FormDescription>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="includes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Includes</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="excludes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Excludes</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="custom_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Instructions</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional" rows={3} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="custom_categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Categories (JSON)</FormLabel>
              <FormControl>
                <Textarea placeholder='{"topic":"Description"}' rows={3} {...field} />
              </FormControl>
              <FormDescription>JSON object mapping category to description</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="infer"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Infer Memory</FormLabel>
                <FormDescription>Use LLM to infer memory</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="async_mode"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Async Mode</FormLabel>
                <FormDescription>Process multiple memories in parallel</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enable_graph"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Enable Graph</FormLabel>
                <FormDescription>Extract entities and relations</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || !hasApiKey}>
          <CreateSubmitButton isSubmitting={isSubmitting} />
        </Button>
      </form>
    </Form>
  );
}
