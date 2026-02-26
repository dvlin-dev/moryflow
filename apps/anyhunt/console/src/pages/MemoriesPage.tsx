/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Memories 页面 - 记忆列表与管理（Lucide icons direct render）
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Brain, Download } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import { useMemories, useExportMemories, MemoryListCard, type Memory } from '@/features/memox';

const DEFAULT_EXPORT_SCHEMA = {
  type: 'object',
  properties: {
    memory: { type: 'string' },
    metadata: { type: 'object' },
  },
  required: ['memory'],
};

type MemoriesViewState = 'no_key' | 'missing_user' | 'loading' | 'error' | 'empty' | 'ready';

function resolveMemoriesViewState(params: {
  apiKeyValue: string;
  userId: string;
  isLoading: boolean;
  hasError: boolean;
  memoriesLength: number;
}): MemoriesViewState {
  if (!params.apiKeyValue) {
    return 'no_key';
  }

  if (!params.userId) {
    return 'missing_user';
  }

  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.memoriesLength === 0) {
    return 'empty';
  }

  return 'ready';
}

function MissingApiKeyState() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        Select an API key to load memories.
      </CardContent>
    </Card>
  );
}

function MissingUserState() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        User ID is required for listing memories.
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
    </Card>
  );
}

function ErrorState() {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Failed to load memories.</p>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <CardDescription>No memories found.</CardDescription>
        <p className="text-sm text-muted-foreground mt-2">
          Memories are created via the Memox API.
        </p>
      </CardContent>
    </Card>
  );
}

function ReadyState({ memories }: { memories: Memory[] }) {
  return (
    <div className="grid gap-4">
      {memories.map((memory) => (
        <MemoryListCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}

export default function MemoriesPage() {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('');
  const [userId, setUserId] = useState('');

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const { activeKeys, effectiveKeyId, apiKeyValue, apiKeyDisplay } = resolveActiveApiKeySelection(
    apiKeys,
    selectedApiKeyId
  );

  const queryParams = useMemo(
    () => ({
      user_id: userId || undefined,
      page: 1,
      page_size: 100,
    }),
    [userId]
  );

  const { data: memories = [], isLoading, error } = useMemories(
    apiKeyValue,
    queryParams,
    Boolean(apiKeyValue && userId)
  );
  const exportMutation = useExportMemories();
  const viewState = resolveMemoriesViewState({
    apiKeyValue,
    userId,
    isLoading,
    hasError: Boolean(error),
    memoriesLength: memories.length,
  });

  const handleExport = async () => {
    if (!apiKeyValue) {
      toast.error('Select an API key');
      return;
    }

    if (!userId) {
      toast.error('User ID is required for export');
      return;
    }

    try {
      const blob = await exportMutation.mutateAsync({
        apiKey: apiKeyValue,
        payload: {
          schema: DEFAULT_EXPORT_SCHEMA,
          filters: { user_id: userId },
        },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memories-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Exported JSON successfully');
    } catch {
      toast.error('Export failed');
    }
  };

  const renderContentByState = () => {
    switch (viewState) {
      case 'no_key':
        return <MissingApiKeyState />;
      case 'missing_user':
        return <MissingUserState />;
      case 'loading':
        return <LoadingState />;
      case 'error':
        return <ErrorState />;
      case 'empty':
        return <EmptyState />;
      case 'ready':
        return <ReadyState memories={memories} />;
      default:
        return null;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Memories
          </h1>
          <p className="text-muted-foreground mt-1">View Mem0-style memories for a user.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending || memories.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <ApiKeySelector
                apiKeys={activeKeys}
                selectedKeyId={effectiveKeyId}
                onKeyChange={setSelectedApiKeyId}
                disabled={isLoadingKeys}
              />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input placeholder="Select an API key" value={apiKeyDisplay} readOnly />
            </div>

            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="user-123"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {renderContentByState()}
    </div>
  );
}
