/**
 * [PROPS]: ScrapeResultPanelProps
 * [EMITS]: none
 * [POS]: Scrape Playground 结果区状态分发层
 */

import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { ScrapeResponse } from '@/features/playground-shared';
import { ScrapeResult } from './scrape-result';

type ScrapeResultPanelProps = {
  data: ScrapeResponse | undefined;
  error: Error | null;
};

type ScrapeResultState = 'error' | 'success' | 'empty';

const getScrapeResultState = ({ data, error }: ScrapeResultPanelProps): ScrapeResultState => {
  if (error) return 'error';
  if (data) return 'success';
  return 'empty';
};

const renderScrapeResultByState = ({ data, error }: ScrapeResultPanelProps, state: ScrapeResultState) => {
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
      return data ? <ScrapeResult data={data} /> : null;
    case 'empty':
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Enter a URL and click "Scrape" to see results here.</p>
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
};

export function ScrapeResultPanel(props: ScrapeResultPanelProps) {
  const state = getScrapeResultState(props);
  return renderScrapeResultByState(props, state);
}
