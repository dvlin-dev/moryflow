/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Embed Playground 页面（交互式测试 oEmbed API，容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, Card, CardContent, PageHeader, Skeleton } from '@moryflow/ui';
import { useApiKeys, resolveActiveApiKeySelection } from '@/features/api-keys';
import {
  EmbedForm,
  EmbedResultDisplay,
  useFetchEmbed,
  type EmbedFormData,
  type EmbedResult,
} from '@/features/embed-playground';

type EmbedResultViewState = 'idle' | 'error' | 'ready';

function resolveResultViewState(params: {
  result: EmbedResult | null;
  error: string | null;
}): EmbedResultViewState {
  if (params.error) {
    return 'error';
  }

  if (params.result) {
    return 'ready';
  }

  return 'idle';
}

function EmbedResultIdleState() {
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center py-12">
        <p className="text-muted-foreground">Enter a URL and click fetch, embed data will appear here</p>
      </CardContent>
    </Card>
  );
}

function EmbedResultErrorState({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

export default function EmbedPlaygroundPage() {
  const { data: apiKeys = [], isLoading: keysLoading } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [result, setResult] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: fetchEmbed, isPending } = useFetchEmbed();

  const { activeKeys, effectiveKeyId, apiKeyValue, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );

  const handleSubmit = (request: EmbedFormData) => {
    if (!apiKeyValue) {
      return;
    }

    setResult(null);
    setError(null);

    fetchEmbed(
      {
        apiKey: apiKeyValue,
        request,
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: (fetchError) => {
          setError(fetchError.message || 'Failed to fetch embed data');
        },
      }
    );
  };

  const resultViewState = resolveResultViewState({ result, error });

  const renderResultByState = () => {
    switch (resultViewState) {
      case 'error':
        return <EmbedResultErrorState error={error ?? 'Failed to fetch embed data'} />;
      case 'ready':
        return result ? <EmbedResultDisplay result={result} /> : null;
      case 'idle':
        return <EmbedResultIdleState />;
      default:
        return null;
    }
  };

  if (keysLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Embed" description="Interactive oEmbed API testing" />
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasActiveKey) {
    return (
      <div className="space-y-6">
        <PageHeader title="Embed" description="Interactive oEmbed API testing" />
        <Alert>
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have an active API key yet. Please create one on the{' '}
            <a href="/api-keys" className="underline font-medium text-orange-500">
              API Keys page
            </a>{' '}
            first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Embed"
        description="Test the oEmbed API interactively, fetch embed data from Twitter, YouTube, Spotify and more"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="pt-6">
              <EmbedForm
                apiKeys={activeKeys}
                selectedKeyId={effectiveKeyId}
                onKeyChange={setSelectedKeyId}
                onSubmit={handleSubmit}
                isLoading={isPending}
              />
            </CardContent>
          </Card>
        </div>

        <div>{renderResultByState()}</div>
      </div>
    </div>
  );
}
