/**
 * Crawl Playground 页面
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { CrawlForm, CrawlResult, useCrawl } from '@/features/crawl-playground';
import { CodeExample } from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

export default function CrawlPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<CrawlRequest | null>(null);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { crawl, isLoading, data, error, reset } = useCrawl(apiKeyValue, {
    onSuccess: (result: CrawlResponse) => {
      if (result.status === 'COMPLETED') {
        toast.success(`Crawl completed: ${result.data?.length || 0} pages`);
      } else if (result.status === 'FAILED') {
        toast.error(`Crawl failed: ${result.error?.message}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Request failed: ${err.message}`);
    },
  });

  const handleSubmit = (request: CrawlRequest) => {
    setLastRequest(request);
    reset();
    crawl(request);
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
        <h1 className="text-2xl font-semibold">Crawl Playground</h1>
        <p className="text-muted-foreground mt-1">
          Crawl multiple pages from a website with configurable depth and limits.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>Configure crawl options and start crawling</CardDescription>
            </CardHeader>
            <CardContent>
              <CrawlForm
                apiKeys={apiKeys}
                selectedKeyId={effectiveKeyId}
                onKeyChange={setSelectedKeyId}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {lastRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Code Example</CardTitle>
                <CardDescription>Copy and use this code in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeExample
                  endpoint={FETCHX_API.CRAWL}
                  method="POST"
                  apiKey={apiKeyDisplay}
                  apiKeyValue={apiKeyValue}
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

          {data && <CrawlResult data={data} />}

          {!data && !error && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  Enter a URL and click "Crawl" to see results here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
