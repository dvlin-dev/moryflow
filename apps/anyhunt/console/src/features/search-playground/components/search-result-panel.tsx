/**
 * [PROPS]: SearchResultPanelProps
 * [EMITS]: none
 * [POS]: Search Playground 结果区组件
 */

import { CircleCheck, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import type { SearchResponse } from '../index';

type SearchResultPanelProps = {
  data: SearchResponse | undefined;
  error: Error | null;
};

function getSearchResultContent(result: SearchResponse['results'][number]): string {
  return result.markdown || result.content || '';
}

function SearchResultList({ results }: { results: SearchResponse['results'] }) {
  if (results.length === 0) {
    return <p className="text-muted-foreground">No results found</p>;
  }

  return (
    <div className="max-h-[500px] space-y-4 overflow-auto">
      {results.map((result, index) => {
        const content = getSearchResultContent(result);
        const contentPreview = content.slice(0, 1000);
        const shouldTruncate = content.length > 1000;

        return (
          <div key={index} className="space-y-2 rounded-lg border p-4">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {result.title}
            </a>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">{result.url}</span>
            </div>

            {result.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{result.description}</p>
            )}

            {content && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View scraped content
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">
                  {contentPreview}
                  {shouldTruncate && '...'}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SearchResultPanel({ data, error }: SearchResultPanelProps) {
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Enter a query and click "Search" to see results.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleCheck className="h-5 w-5 text-green-600" />
          {data.results.length} Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SearchResultList results={data.results} />
      </CardContent>
    </Card>
  );
}
