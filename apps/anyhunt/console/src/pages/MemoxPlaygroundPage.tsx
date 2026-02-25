/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Memox Playground 页面（容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Brain } from 'lucide-react';
import { Card, CardContent } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import {
  type Memory,
  type MemorySearchResult,
  type MemoxPlaygroundTab,
  type CreateMemoryFormInput,
  type CreateMemoryFormValues,
  type SearchMemoryFormInput,
  type SearchMemoryFormValues,
  useCreateMemory,
  useSearchMemories,
  createMemorySchema,
  createMemoryDefaults,
  searchMemorySchema,
  searchMemoryDefaults,
  buildCreateMemoryRequest,
  buildSearchMemoryRequest,
  buildCreateCodeExampleBody,
  buildSearchCodeExampleBody,
  mapCreateMemoryResponseToMemory,
  MemoxPlaygroundRequestCard,
  MemoxPlaygroundResultPanel,
} from '@/features/memox';

export default function MemoxPlaygroundPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [activeTab, setActiveTab] = useState<MemoxPlaygroundTab>('create');
  const [createdMemory, setCreatedMemory] = useState<Memory | null>(null);
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [lastCreateRequest, setLastCreateRequest] = useState<CreateMemoryFormValues | null>(null);
  const [lastSearchRequest, setLastSearchRequest] = useState<SearchMemoryFormValues | null>(null);

  const { effectiveKeyId, apiKeyValue, apiKeyDisplay } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const createMemoryMutation = useCreateMemory();
  const searchMemoriesMutation = useSearchMemories();

  const createForm = useForm<CreateMemoryFormInput, unknown, CreateMemoryFormValues>({
    resolver: zodResolver(createMemorySchema),
    defaultValues: createMemoryDefaults,
  });

  const searchForm = useForm<SearchMemoryFormInput, unknown, SearchMemoryFormValues>({
    resolver: zodResolver(searchMemorySchema),
    defaultValues: searchMemoryDefaults,
  });

  const createCodeExampleBody = useMemo(
    () => (lastCreateRequest ? buildCreateCodeExampleBody(lastCreateRequest) : null),
    [lastCreateRequest]
  );

  const searchCodeExampleBody = useMemo(
    () => (lastSearchRequest ? buildSearchCodeExampleBody(lastSearchRequest) : null),
    [lastSearchRequest]
  );

  const handleCreate = async (values: CreateMemoryFormValues) => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }

    setLastCreateRequest(values);
    setCreatedMemory(null);

    const createRequestResult = buildCreateMemoryRequest(values);
    if (createRequestResult.error) {
      toast.error(createRequestResult.error);
      return;
    }

    if (!createRequestResult.request) {
      toast.error('Invalid create memory request');
      return;
    }

    try {
      const result = await createMemoryMutation.mutateAsync({
        apiKey: apiKeyValue,
        data: createRequestResult.request,
      });

      setCreatedMemory(mapCreateMemoryResponseToMemory(result));
      toast.success('Memory created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create memory');
    }
  };

  const handleSearch = async (values: SearchMemoryFormValues) => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }

    setLastSearchRequest(values);
    setSearchResults(null);

    const searchRequestResult = buildSearchMemoryRequest(values);
    if (searchRequestResult.error) {
      toast.error(searchRequestResult.error);
      return;
    }

    if (!searchRequestResult.request) {
      toast.error('Invalid search request');
      return;
    }

    try {
      const results = await searchMemoriesMutation.mutateAsync({
        apiKey: apiKeyValue,
        data: searchRequestResult.request,
      });

      setSearchResults(results);
      toast.success(`Found ${results.length} memories`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed');
    }
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
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Memox Playground
        </h1>
        <p className="text-muted-foreground mt-1">
          Test the Memory API: create memories and search semantically.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <MemoxPlaygroundRequestCard
          apiKeys={apiKeys}
          effectiveKeyId={effectiveKeyId}
          apiKeyDisplay={apiKeyDisplay}
          apiKeyValue={apiKeyValue}
          activeTab={activeTab}
          createForm={createForm}
          searchForm={searchForm}
          isCreateSubmitting={createMemoryMutation.isPending}
          isSearchSubmitting={searchMemoriesMutation.isPending}
          createCodeExampleBody={createCodeExampleBody}
          searchCodeExampleBody={searchCodeExampleBody}
          onKeyChange={setSelectedKeyId}
          onActiveTabChange={setActiveTab}
          onCreateSubmit={handleCreate}
          onSearchSubmit={handleSearch}
        />

        <MemoxPlaygroundResultPanel
          activeTab={activeTab}
          createdMemory={createdMemory}
          searchResults={searchResults}
        />
      </div>
    </div>
  );
}
