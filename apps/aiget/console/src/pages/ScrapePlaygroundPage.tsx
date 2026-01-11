/**
 * Scrape Playground 页面
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import { ScrapeForm, ScrapeResult, useScrape } from '@/features/scrape-playground';
import { CodeExample } from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

export default function ScrapePlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ScrapeRequest | null>(null);

  // 如果用户未手动选择，使用第一个活跃的 API Key
  const effectiveKeyId = selectedKeyId ?? apiKeys.find((k) => k.isActive)?.id ?? '';
  const selectedKey = apiKeys.find((k) => k.id === effectiveKeyId);
  const apiKeyValue = selectedKey?.keyPrefix ? `${selectedKey.keyPrefix}...` : '';

  const { scrape, isLoading, data, error, reset } = useScrape(selectedKey?.keyPrefix || '', {
    onSuccess: (result: ScrapeResponse) => {
      if (result.status === 'COMPLETED') {
        toast.success('Scrape completed successfully');
      } else if (result.status === 'FAILED') {
        toast.error(`Scrape failed: ${result.error?.message}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Request failed: ${err.message}`);
    },
  });

  const handleSubmit = (request: ScrapeRequest) => {
    setLastRequest(request);
    reset();
    scrape(request);
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
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-semibold">Scrape Playground</h1>
        <p className="text-muted-foreground mt-1">
          Test the Scrape API with various output formats and options.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：表单 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
              <CardDescription>Configure scrape options and submit a request</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrapeForm
                apiKeys={apiKeys}
                selectedKeyId={effectiveKeyId}
                onKeyChange={setSelectedKeyId}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* 代码示例 */}
          {lastRequest && (
            <Card>
              <CardHeader>
                <CardTitle>Code Example</CardTitle>
                <CardDescription>Copy and use this code in your application</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeExample
                  endpoint={FETCHX_API.SCRAPE}
                  method="POST"
                  apiKey={apiKeyValue}
                  body={lastRequest}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：结果 */}
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

          {data && <ScrapeResult data={data} />}

          {!data && !error && (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  Enter a URL and click "Scrape" to see results here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
