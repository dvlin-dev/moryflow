/**
 * Embed Playground 页面
 * 交互式测试 oEmbed API
 */
import { useMemo, useState } from 'react';
import { PageHeader } from '@aiget/ui/composed';
import { Card, CardContent, Skeleton, Alert, AlertDescription } from '@aiget/ui/primitives';
import { AlertTriangle } from 'lucide-react';
import { useApiKeys } from '@/features/api-keys';
import {
  EmbedForm,
  EmbedResultDisplay,
  useFetchEmbed,
  type EmbedFormData,
  type EmbedResult,
} from '@/features/embed-playground';

export default function EmbedPlaygroundPage() {
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [result, setResult] = useState<EmbedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: fetchEmbed, isPending } = useFetchEmbed();

  const defaultKeyId = useMemo(() => {
    const firstActiveKey = apiKeys?.find((k) => k.isActive) || apiKeys?.[0];
    return firstActiveKey?.id ?? '';
  }, [apiKeys]);

  const activeKeyId = selectedKeyId || defaultKeyId;

  const handleSubmit = (request: EmbedFormData) => {
    if (!activeKeyId) return;

    setResult(null);
    setError(null);

    fetchEmbed(
      {
        apiKeyId: activeKeyId,
        request,
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: (err) => {
          setError(err.message || 'Failed to fetch embed data');
        },
      }
    );
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

  if (!apiKeys?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Embed" description="Interactive oEmbed API testing" />
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You haven't created any API Keys yet. Please create one on the{' '}
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
        {/* 左侧：表单 */}
        <div>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="pt-6">
              <EmbedForm
                apiKeys={apiKeys}
                selectedKeyId={activeKeyId}
                onKeyChange={setSelectedKeyId}
                onSubmit={handleSubmit}
                isLoading={isPending}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右侧：结果 */}
        <div>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : result ? (
            <EmbedResultDisplay result={result} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Enter a URL and click fetch, embed data will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
