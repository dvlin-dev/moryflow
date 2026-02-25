/**
 * [PROPS]: data
 * [EMITS]: none
 * [POS]: Crawl 结果展示组件（Lucide icons direct render）
 * Console Playground 强制同步模式，无需进度显示
 */

import { CircleCheck, X, Globe, File, Link } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@moryflow/ui';
import type { CrawlResponse } from '@/features/playground-shared';

interface CrawlResultProps {
  data: CrawlResponse;
}

export function CrawlResult({ data }: CrawlResultProps) {
  // 错误处理
  if (data.status === 'FAILED') {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <X className="h-5 w-5" />
            Crawl Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="font-mono text-sm">
              {data.error?.code}: {data.error?.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 同步完成 - 直接显示结果
  const pages = data.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleCheck className="h-5 w-5 text-green-600" />
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
                      <File className="h-3 w-3 shrink-0" />
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
                    <Globe className="h-4 w-4 text-muted-foreground" />
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
                        <Link className="h-4 w-4" />
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
