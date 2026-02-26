/**
 * [PROPS]: MapRequestCardProps
 * [EMITS]: onSubmit/onOptionsOpenChange/onKeyChange
 * [POS]: Map Playground 请求区组件
 */

import type { UseFormReturn } from 'react-hook-form';
import { Loader, Map } from 'lucide-react';
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
  Switch,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  CollapsibleSection,
  type MapFormValues,
} from '@/features/playground-shared';

type MapRequestCardProps = {
  apiKeys: ApiKey[];
  effectiveKeyId: string;
  hasActiveKey: boolean;
  isPending: boolean;
  optionsOpen: boolean;
  form: UseFormReturn<MapFormValues>;
  onSubmit: (values: MapFormValues) => void;
  onOptionsOpenChange: (open: boolean) => void;
  onKeyChange: (keyId: string) => void;
};

function MapSubmitIcon({ isPending }: { isPending: boolean }) {
  if (isPending) {
    return <Loader className="h-4 w-4 animate-spin" />;
  }

  return <Map className="h-4 w-4" />;
}

export function MapRequestCard({
  apiKeys,
  effectiveKeyId,
  hasActiveKey,
  isPending,
  optionsOpen,
  form,
  onSubmit,
  onOptionsOpenChange,
  onKeyChange,
}: MapRequestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Configure map options and discover URLs</CardDescription>
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
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        className="flex-1"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <Button type="submit" disabled={isPending || !hasActiveKey}>
                      <MapSubmitIcon isPending={isPending} />
                      <span className="ml-2">Map</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CollapsibleSection title="Options" open={optionsOpen} onOpenChange={onOptionsOpenChange}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="search"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Filter</FormLabel>
                      <FormControl>
                        <Input placeholder="blog" disabled={isPending} {...field} />
                      </FormControl>
                      <FormDescription>Only return URLs containing this text</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limit</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={5000} disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeSubdomains"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Include Subdomains</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleSection>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
