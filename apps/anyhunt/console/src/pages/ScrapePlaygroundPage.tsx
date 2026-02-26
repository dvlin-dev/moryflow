/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Scrape Playground 页面（容器编排层）
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import {
  ScrapeRequestCard,
  ScrapeResultPanel,
  useScrape,
} from '@/features/scrape-playground';
import {
  FETCHX_API,
} from '@/lib/api-paths';
import {
  PlaygroundCodeExampleCard,
  PlaygroundLoadingState,
  PlaygroundPageShell,
  isScrapeError,
  type ScrapeRequest,
  type ScrapeResponse,
} from '@/features/playground-shared';

export default function ScrapePlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<ScrapeRequest | null>(null);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { scrape, isLoading, data, error, reset } = useScrape(apiKeyValue, {
    onSuccess: (result: ScrapeResponse) => {
      if (isScrapeError(result)) {
        toast.error(`Scrape failed: ${result.error.message}`);
        return;
      }

      toast.success('Scrape completed successfully');
    },
    onError: (requestError: Error) => {
      toast.error(`Request failed: ${requestError.message}`);
    },
  });

  const handleSubmit = (request: ScrapeRequest) => {
    setLastRequest(request);
    reset();
    scrape(request);
  };

  if (isLoadingKeys) {
    return <PlaygroundLoadingState />;
  }

  const requestContent = (
    <ScrapeRequestCard
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
        endpoint={FETCHX_API.SCRAPE}
        method="POST"
        apiKey={apiKeyDisplay}
        apiKeyValue={apiKeyValue}
        body={lastRequest}
      />
    );
  };

  const codeExampleContent = renderCodeExampleContent();

  const resultContent = <ScrapeResultPanel data={data} error={error} />;

  return (
    <PlaygroundPageShell
      title="Scrape Playground"
      description="Test the Scrape API with various output formats and options."
      request={requestContent}
      codeExample={codeExampleContent}
      result={resultContent}
    />
  );
}
