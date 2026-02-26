/**
 * [PROPS]: CrawlResultPanelProps
 * [EMITS]: none
 * [POS]: Crawl Playground 结果区状态分发层
 */

import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { CrawlResponse } from '@/features/playground-shared';
import { CrawlResult } from './crawl-result';

type CrawlResultPanelProps = {
  data: CrawlResponse | undefined;
  error: Error | null;
};

type CrawlResultState = 'error' | 'success' | 'empty';

const getCrawlResultState = ({ data, error }: CrawlResultPanelProps): CrawlResultState => {
  if (error) return 'error';
  if (data) return 'success';
  return 'empty';
};

const renderCrawlResultByState = ({ data, error }: CrawlResultPanelProps, state: CrawlResultState) => {
  switch (state) {
    case 'error':
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error?.message}</p>
          </CardContent>
        </Card>
      );
    case 'success':
      return data ? <CrawlResult data={data} /> : null;
    case 'empty':
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Enter a URL and click "Crawl" to see results here.</p>
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
};

export function CrawlResultPanel(props: CrawlResultPanelProps) {
  const state = getCrawlResultState(props);
  return renderCrawlResultByState(props, state);
}
