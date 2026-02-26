/**
 * [PROPS]: SearchRequestCardProps
 * [EMITS]: onSubmit/onOptionsOpenChange/onKeyChange
 * [POS]: Search Playground 请求区组件
 */

import type { UseFormReturn } from 'react-hook-form';
import { Loader, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  CollapsibleSection,
  type SearchFormValues,
} from '@/features/playground-shared';

type SearchRequestCardProps = {
  apiKeys: ApiKey[];
  effectiveKeyId: string;
  hasActiveKey: boolean;
  isPending: boolean;
  optionsOpen: boolean;
  form: UseFormReturn<SearchFormValues>;
  onSubmit: (values: SearchFormValues) => void;
  onOptionsOpenChange: (open: boolean) => void;
  onKeyChange: (keyId: string) => void;
};

function SearchSubmitIcon({ isPending }: { isPending: boolean }) {
  if (isPending) {
    return <Loader className="h-4 w-4 animate-spin" />;
  }

  return <Search className="h-4 w-4" />;
}

export function SearchRequestCard({
  apiKeys,
  effectiveKeyId,
  hasActiveKey,
  isPending,
  optionsOpen,
  form,
  onSubmit,
  onOptionsOpenChange,
  onKeyChange,
}: SearchRequestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Enter a search query</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ApiKeySelector
              apiKeys={apiKeys}
              selectedKeyId={effectiveKeyId}
              onKeyChange={onKeyChange}
              disabled={isPending}
            />

            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Query</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Best programming languages 2024"
                        className="flex-1"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <Button type="submit" disabled={isPending || !hasActiveKey}>
                      <SearchSubmitIcon isPending={isPending} />
                      <span className="ml-2">Search</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CollapsibleSection title="Options" open={optionsOpen} onOpenChange={onOptionsOpenChange}>
              <FormField
                control={form.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Results Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={20} disabled={isPending} {...field} />
                    </FormControl>
                    <FormDescription>Maximum number of results to return</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleSection>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
