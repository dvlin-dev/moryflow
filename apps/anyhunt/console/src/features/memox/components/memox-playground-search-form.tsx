/**
 * [PROPS]: form, isSubmitting, hasApiKey, onSubmit
 * [EMITS]: onSubmit(values)
 * [POS]: Memox Playground 搜索记忆表单
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { ChangeEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader, Search } from 'lucide-react';
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
import type { SearchMemoryFormInput, SearchMemoryFormValues } from '../playground-schemas';

interface MemoxPlaygroundSearchFormProps {
  form: UseFormReturn<SearchMemoryFormInput, unknown, SearchMemoryFormValues>;
  isSubmitting: boolean;
  hasApiKey: boolean;
  onSubmit: (values: SearchMemoryFormValues) => void;
}

function SearchSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  if (isSubmitting) {
    return (
      <>
        <Loader className="h-4 w-4 animate-spin mr-2" />
        Searching...
      </>
    );
  }

  return (
    <>
      <Search className="h-4 w-4 mr-2" />
      Search Memories
    </>
  );
}

export function MemoxPlaygroundSearchForm({
  form,
  isSubmitting,
  hasApiKey,
  onSubmit,
}: MemoxPlaygroundSearchFormProps) {
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
          name="query"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Search Query *</FormLabel>
              <FormControl>
                <Textarea placeholder="What are you looking for?" rows={3} {...field} />
              </FormControl>
              <FormDescription>Semantic search - describe what you're looking for</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="top_k"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top K</FormLabel>
                <FormControl>
                  <Input type="number" min="1" max="100" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Threshold</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    placeholder="0.3"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={
                      typeof field.value === 'number' && !Number.isNaN(field.value)
                        ? field.value
                        : ''
                    }
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const nextValue = event.target.value;
                      if (nextValue === '') {
                        field.onChange(undefined);
                        return;
                      }

                      const parsedValue = Number(nextValue);
                      field.onChange(Number.isNaN(parsedValue) ? undefined : parsedValue);
                    }}
                  />
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="filters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Filters (JSON)</FormLabel>
              <FormControl>
                <Textarea placeholder='{"AND":[{"user_id":"user-1"}]}' rows={3} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <FormControl>
                <Input placeholder="comma separated" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keyword_search"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Keyword Search</FormLabel>
                <FormDescription>Use keyword search instead of embeddings</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rerank"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Rerank</FormLabel>
                <FormDescription>Rerank results using query relevance</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="filter_memories"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Filter Memories</FormLabel>
                <FormDescription>Apply filters and metadata constraints</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="only_metadata_based_search"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="space-y-1">
                <FormLabel>Metadata Only</FormLabel>
                <FormDescription>Search only using metadata and filters</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || !hasApiKey}>
          <SearchSubmitButton isSubmitting={isSubmitting} />
        </Button>
      </form>
    </Form>
  );
}
