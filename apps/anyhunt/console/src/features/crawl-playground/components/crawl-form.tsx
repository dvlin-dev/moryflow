/**
 * [PROPS]: apiKeys, selectedKeyId, onKeyChange, onSubmit, isLoading
 * [EMITS]: onSubmit(request)
 * [POS]: Crawl 表单组件（react-hook-form + zod，Lucide icons direct render）
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Globe, Loader } from 'lucide-react';
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
  Switch,
} from '@anyhunt/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  CollapsibleSection,
  crawlFormSchema,
  crawlFormDefaults,
  type CrawlFormValues,
  type CrawlRequest,
} from '@/features/playground-shared';
import { useState } from 'react';

interface CrawlFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string | null) => void;
  onSubmit: (request: CrawlRequest) => void;
  isLoading?: boolean;
}

export function CrawlForm({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  onSubmit,
  isLoading,
}: CrawlFormProps) {
  const [optionsOpen, setOptionsOpen] = useState(true);

  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(crawlFormSchema),
    defaultValues: crawlFormDefaults,
  });

  const handleFormSubmit = (values: CrawlFormValues) => {
    const request: CrawlRequest = {
      url: values.url,
      maxDepth: values.maxDepth,
      limit: values.limit,
      allowExternalLinks: values.allowExternalLinks,
    };

    if (values.includePaths.trim()) {
      request.includePaths = values.includePaths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    if (values.excludePaths.trim()) {
      request.excludePaths = values.excludePaths
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    onSubmit(request);
  };

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);
  const hasActiveKey = selectedKey?.isActive;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <ApiKeySelector
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onKeyChange={onKeyChange}
          disabled={isLoading}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start URL</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    className="flex-1"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <Button type="submit" disabled={isLoading || !hasActiveKey}>
                  {isLoading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <span className="ml-2">Crawl</span>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <CollapsibleSection title="Crawl Options" open={optionsOpen} onOpenChange={setOptionsOpen}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Depth</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>How deep to follow links</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>Maximum pages to crawl</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includePaths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Include Paths</FormLabel>
                  <FormControl>
                    <Input placeholder="/blog, /docs" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription>Only crawl URLs matching these paths</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excludePaths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclude Paths</FormLabel>
                  <FormControl>
                    <Input placeholder="/admin, /private" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription>Skip URLs matching these paths</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowExternalLinks"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Allow External Links</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>
      </form>
    </Form>
  );
}
