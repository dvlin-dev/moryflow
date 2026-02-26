/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Map Playground 页面（容器编排层）
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { useMap, type MapRequest, type MapResponse } from '@/features/map-playground';
import { MapRequestCard } from '@/features/map-playground/components/map-request-card';
import { MapResultPanel } from '@/features/map-playground/components/map-result-panel';
import {
  PlaygroundCodeExampleCard,
  PlaygroundLoadingState,
  PlaygroundPageShell,
  mapFormSchema,
  mapFormDefaults,
  type MapFormValues,
} from '@/features/playground-shared';
import { FETCHX_API } from '@/lib/api-paths';

export default function MapPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [lastRequest, setLastRequest] = useState<MapRequest | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const { mutate, isPending, data, error, reset } = useMap(apiKeyValue);

  const form = useForm<MapFormValues>({
    resolver: zodResolver(mapFormSchema),
    defaultValues: mapFormDefaults,
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
        toast.success(`Found ${result.links.length} URLs`);
      },
      onError: (err: Error) => {
        toast.error(`Map failed: ${err.message}`);
      },
    });
  };

  if (isLoadingKeys) {
    return <PlaygroundLoadingState />;
  }

  const requestContent = (
    <MapRequestCard
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
        endpoint={FETCHX_API.MAP}
        method="POST"
        apiKey={apiKeyDisplay}
        apiKeyValue={apiKeyValue}
        body={lastRequest}
      />
    );
  };

  const codeExampleContent = renderCodeExampleContent();

  const resultContent = <MapResultPanel data={data} error={error} />;

  return (
    <PlaygroundPageShell
      title="Map Playground"
      description="Discover all URLs on a website through sitemap and link discovery."
      request={requestContent}
      codeExample={codeExampleContent}
      result={resultContent}
    />
  );
}
