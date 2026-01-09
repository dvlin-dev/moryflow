/**
 * Screenshot Playground 页面
 * 交互式测试截图 API
 */
import { useMemo, useState } from 'react';
import { Alert01Icon } from '@hugeicons/core-free-icons';
import { PageHeader, Card, CardContent, Skeleton, Alert, AlertDescription, Icon } from '@aiget/ui';
import { useApiKeys } from '@/features/api-keys';
import {
  ScreenshotForm,
  ScreenshotResult,
  useTakeScreenshot,
  isScreenshotSuccess,
} from '@/features/playground';
import type { ScreenshotRequest, ScreenshotData } from '@/features/playground';

export default function ScreenshotPlaygroundPage() {
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [result, setResult] = useState<ScreenshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: takeScreenshot, isPending } = useTakeScreenshot();

  const defaultKeyId = useMemo(() => {
    const firstActiveKey = apiKeys?.find((k) => k.isActive) || apiKeys?.[0];
    return firstActiveKey?.id ?? '';
  }, [apiKeys]);

  const activeKeyId = selectedKeyId || defaultKeyId;

  const handleSubmit = (request: ScreenshotRequest) => {
    if (!activeKeyId) return;

    setResult(null);
    setError(null);

    takeScreenshot(
      {
        apiKeyId: activeKeyId,
        request,
      },
      {
        onSuccess: (response) => {
          if (isScreenshotSuccess(response)) {
            setResult(response.data);
          } else {
            setError(response.error.message);
          }
        },
        onError: (err) => {
          setError(err.message || 'Screenshot failed');
        },
      }
    );
  };

  if (keysLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Screenshot" description="Interactive screenshot API testing" />
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
        <PageHeader title="Screenshot" description="Interactive screenshot API testing" />
        <Alert>
          <Icon icon={Alert01Icon} className="h-4 w-4" />
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
        title="Screenshot"
        description="Test the screenshot API interactively, adjust parameters and preview results"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：表单 */}
        <div>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="pt-6">
              <ScreenshotForm
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
              <Icon icon={Alert01Icon} className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : result ? (
            <ScreenshotResult data={result} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  Enter a URL and click the screenshot button, results will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
