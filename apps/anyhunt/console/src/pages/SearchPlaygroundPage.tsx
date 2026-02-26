/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Search Playground 页面（容器编排层）
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { useSearch, type SearchRequest, type SearchResponse } from '@/features/search-playground';
import { SearchRequestCard } from '@/features/search-playground/components/search-request-card';
import { SearchResultPanel } from '@/features/search-playground/components/search-result-panel';
import {
  PlaygroundCodeExampleCard,
  PlaygroundLoadingState,
  PlaygroundPageShell,
  searchFormSchema,
  searchFormDefaults,
  type SearchFormValues,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

export default function SearchPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<SearchRequest | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { mutate, isPending, data, error, reset } = useSearch(apiKeyValue);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: searchFormDefaults,
  });

  const handleFormSubmit = (values: SearchFormValues) => {
    const request: SearchRequest = {
      query: values.query,
      limit: values.limit,
    };

    setLastRequest(request);
    reset();
    mutate(request, {
      onSuccess: (result: SearchResponse) => {
        toast.success(`Found ${result.results.length} results`);
      },
      onError: (err: Error) => {
        toast.error(`Search failed: ${err.message}`);
      },
    });
  };

  if (isLoadingKeys) {
    return <PlaygroundLoadingState />;
  }

  const requestContent = (
    <SearchRequestCard
      apiKeys={apiKeys}
      effectiveKeyId={effectiveKeyId}
      hasActiveKey={hasActiveKey}
      isPending={isPending}
      optionsOpen={optionsOpen}
      form={form}
      onSubmit={handleFormSubmit}
      onOptionsOpenChange={setOptionsOpen}
      onKeyChange={setSelectedKeyId}
    />
  );

  const renderCodeExampleContent = () => {
    if (!lastRequest) {
      return null;
    }

    return (
      <PlaygroundCodeExampleCard
        endpoint={FETCHX_API.SEARCH}
        method="POST"
        apiKey={apiKeyDisplay}
        apiKeyValue={apiKeyValue}
        body={lastRequest}
      />
    );
  };

  const codeExampleContent = renderCodeExampleContent();

  const resultContent = <SearchResultPanel data={data} error={error} />;

  return (
    <PlaygroundPageShell
      title="Search Playground"
      description="Search the web and get scraped content from results."
      request={requestContent}
      codeExample={codeExampleContent}
      result={resultContent}
    />
  );
}
