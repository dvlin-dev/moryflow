/**
 * Map Playground 页面
 * 使用 react-hook-form + zod 验证
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod/v4';
import { toast } from 'sonner';
import {
  MapsGlobal01Icon,
  Loading01Icon,
  Link01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
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
  Icon,
  Input,
  Switch,
} from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import { useMap, type MapRequest, type MapResponse } from '@/features/map-playground';
import {
  ApiKeySelector,
  CodeExample,
  CollapsibleSection,
  mapFormSchema,
  type MapFormValues,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

export default function MapPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<MapRequest | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // 如果用户未手动选择，使用第一个活跃的 API Key
  const effectiveKeyId = selectedKeyId ?? apiKeys.find((k) => k.isActive)?.id ?? '';
  const selectedKey = apiKeys.find((k) => k.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.keyPrefix ? `${selectedKey.keyPrefix}...` : '';

  const { mutate, isPending, data, error, reset } = useMap(selectedKey?.keyPrefix || '');

  const form = useForm<MapFormValues>({
    resolver: zodResolver(mapFormSchema),
    defaultValues: {
      url: '',
      search: '',
      includeSubdomains: false,
      limit: 100,
    },
  });

  const handleFormSubmit = (values: MapFormValues) => {
    const request: MapRequest = {
      url: values.url,
      includeSubdomains: values.includeSubdomains,
      limit: values.limit,
    };
    if (values.search.trim()) request.search = values.search.trim();

    setLastRequest(request);
    reset();
    mutate(request, {
      onSuccess: (result: MapResponse) => {
        if (result.success) {
          toast.success(`Found ${result.links?.length || 0} URLs`);
        } else {
          toast.error(`Map failed: ${result.error?.message}`);
        }
      },
      onError: (err: Error) => {
        toast.error(`Request failed: ${err.message}`);
      },
    });
  };

  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Map Playground</h1>
        <p className="text-muted-foreground mt-1">
          Discover all URLs on a website through sitemap and link discovery.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>Configure map options and discover URLs</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                  <ApiKeySelector
                    apiKeys={apiKeys}
                    selectedKeyId={effectiveKeyId}
                    onKeyChange={setSelectedKeyId}
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
                          <Button type="submit" disabled={isPending || !selectedKey?.isActive}>
                            {isPending ? (
                              <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icon icon={MapsGlobal01Icon} className="h-4 w-4" />
                            )}
                            <span className="ml-2">Map</span>
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <CollapsibleSection
                    title="Options"
                    open={optionsOpen}
                    onOpenChange={setOptionsOpen}
                  >
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
                              <Input
                                type="number"
                                min={1}
                                max={5000}
                                disabled={isPending}
                                {...field}
                              />
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

          {lastRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Code Example</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeExample
                  endpoint={FETCHX_API.MAP}
                  method="POST"
                  apiKey={apiKeyValue}
                  body={lastRequest}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{error.message}</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {data.success ? (
                    <>
                      <Icon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
                      Found {data.links?.length || 0} URLs
                    </>
                  ) : (
                    <>
                      <Icon icon={Cancel01Icon} className="h-5 w-5 text-destructive" />
                      Map Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.success && data.links && data.links.length > 0 ? (
                  <div className="overflow-auto max-h-[500px] space-y-1">
                    {data.links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted text-xs"
                      >
                        <Icon icon={Link01Icon} className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                ) : data.error ? (
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <p className="font-mono text-sm">
                      {data.error.code}: {data.error.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No URLs found</p>
                )}
              </CardContent>
            </Card>
          )}

          {!data && !error && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  Enter a URL and click "Map" to discover URLs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
