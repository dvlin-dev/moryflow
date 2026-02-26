/**
 * [PROPS]: CrawlRequestCardProps
 * [EMITS]: onSubmit/onKeyChange
 * [POS]: Crawl Playground 请求区卡片（页面编排片段）
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import type { CrawlRequest } from '@/features/playground-shared';
import { CrawlForm } from './crawl-form';

type CrawlRequestCardProps = {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  isLoading: boolean;
  onKeyChange: (keyId: string) => void;
  onSubmit: (request: CrawlRequest) => void;
};

export function CrawlRequestCard({
  apiKeys,
  selectedKeyId,
  isLoading,
  onKeyChange,
  onSubmit,
}: CrawlRequestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Configure crawl options and start crawling</CardDescription>
      </CardHeader>
      <CardContent>
        <CrawlForm
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onKeyChange={onKeyChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
