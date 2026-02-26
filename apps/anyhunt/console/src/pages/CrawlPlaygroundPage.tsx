/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Crawl Playground 页面（容器编排层）
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import {
  CrawlRequestCard,
  CrawlResultPanel,
  useCrawl,
} from '@/features/crawl-playground';
import { FETCHX_API } from '@/lib/api-paths';
import {
  PlaygroundCodeExampleCard,
  PlaygroundLoadingState,
  PlaygroundPageShell,
  type CrawlRequest,
  type CrawlResponse,
} from '@/features/playground-shared';

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
        return;
      }

      if (result.status === 'FAILED') {
        toast.error(`Crawl failed: ${result.error?.message}`);
      }
    },
    onError: (requestError: Error) => {
      toast.error(`Request failed: ${requestError.message}`);
    },
  });

  const handleSubmit = (request: CrawlRequest) => {
    setLastRequest(request);
    reset();
    crawl(request);
  };

  if (isLoadingKeys) {
    return <PlaygroundLoadingState />;
  }

  const requestContent = (
    <CrawlRequestCard
      apiKeys={apiKeys}
      selectedKeyId={effectiveKeyId}
      onKeyChange={setSelectedKeyId}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );

  const renderCodeExampleContent = () => {
    if (!lastRequest) {
      return null;
    }

    return (
      <PlaygroundCodeExampleCard
        endpoint={FETCHX_API.CRAWL}
        method="POST"
        apiKey={apiKeyDisplay}
        apiKeyValue={apiKeyValue}
        body={lastRequest}
      />
    );
  };

  const codeExampleContent = renderCodeExampleContent();

  const resultContent = <CrawlResultPanel data={data} error={error} />;

  return (
    <PlaygroundPageShell
      title="Crawl Playground"
      description="Crawl multiple pages from a website with configurable depth and limits."
      request={requestContent}
      codeExample={codeExampleContent}
      result={resultContent}
    />
  );
}
