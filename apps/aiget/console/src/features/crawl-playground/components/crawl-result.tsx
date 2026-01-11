/**
 * Crawl 结果展示组件
 */

import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Globe02Icon,
  File01Icon,
  Link01Icon,
} from '@hugeicons/core-free-icons';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@aiget/ui';
import type { CrawlResponse } from '@/features/playground-shared';

interface CrawlResultProps {
  data: CrawlResponse;
  progress?: CrawlResponse | null;
}

export function CrawlResult({ data, progress }: CrawlResultProps) {
  const displayData =
    data.status === 'COMPLETED' || data.status === 'FAILED' ? data : progress || data;

  if (displayData.status === 'FAILED') {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Icon icon={Cancel01Icon} className="h-5 w-5" />
            Crawl Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="font-mono text-sm">
              {displayData.error?.code}: {displayData.error?.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayData.status === 'PENDING' || displayData.status === 'PROCESSING') {
    const progressPercent =
      displayData.totalPages && displayData.totalPages > 0
        ? ((displayData.pagesScraped || 0) / displayData.totalPages) * 100
        : 0;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon icon={Globe02Icon} className="h-5 w-5 animate-pulse" />
            Crawling...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Pages scraped: {displayData.pagesScraped || 0}
              {displayData.totalPages ? ` / ${displayData.totalPages}` : ''}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pages = displayData.pages || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
            Crawl Completed
            <Badge variant="secondary" className="ml-2">
              {pages.length} pages
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {pages.length > 0 && (
        <Card>
          <Tabs defaultValue={pages[0]?.url}>
            <CardHeader className="pb-0">
              <div className="overflow-x-auto">
                <TabsList className="w-auto">
                  {pages.slice(0, 10).map((page, index) => (
                    <TabsTrigger key={page.url} value={page.url} className="gap-1 max-w-48">
                      <Icon icon={File01Icon} className="h-3 w-3 shrink-0" />
                      <span className="truncate">Page {index + 1}</span>
                    </TabsTrigger>
                  ))}
                  {pages.length > 10 && (
                    <TabsTrigger value="more" disabled>
                      +{pages.length - 10} more
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {pages.slice(0, 10).map((page) => (
                <TabsContent key={page.url} value={page.url} className="m-0 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon icon={Globe02Icon} className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {page.url}
                    </a>
                  </div>

                  {page.markdown && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Markdown Content</h4>
                      <pre className="overflow-auto max-h-64 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                        {page.markdown}
                      </pre>
                    </div>
                  )}

                  {page.links && page.links.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Icon icon={Link01Icon} className="h-4 w-4" />
                        Links ({page.links.length})
                      </h4>
                      <div className="overflow-auto max-h-48 space-y-1">
                        {page.links.map((link, i) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded hover:bg-muted text-xs truncate"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
