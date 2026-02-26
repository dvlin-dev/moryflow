/**
 * [PROPS]: ScrapeRequestCardProps
 * [EMITS]: onSubmit/onKeyChange
 * [POS]: Scrape Playground 请求区卡片（页面编排片段）
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import type { ScrapeRequest } from '@/features/playground-shared';
import { ScrapeForm } from './scrape-form';

type ScrapeRequestCardProps = {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  isLoading: boolean;
  onKeyChange: (keyId: string) => void;
  onSubmit: (request: ScrapeRequest) => void;
};

export function ScrapeRequestCard({
  apiKeys,
  selectedKeyId,
  isLoading,
  onKeyChange,
  onSubmit,
}: ScrapeRequestCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request</CardTitle>
        <CardDescription>Configure scrape options and submit a request</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrapeForm
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
