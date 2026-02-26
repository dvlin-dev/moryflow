/**
 * [PROPS]: data, viewModel, onPreviewOpen
 * [EMITS]: onPreviewOpen
 * [POS]: Scrape 结果内容 Tabs 区块
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ArrowUpRight, File, Image, Link } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@moryflow/ui';
import type { ScrapeResultResponse } from '@/features/playground-shared';
import type { ScrapeResultViewModel } from './scrape-result-view-model';

interface ScrapeResultContentTabsProps {
  data: ScrapeResultResponse;
  viewModel: ScrapeResultViewModel;
  onPreviewOpen: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) {
    return '-';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ScrapeResultContentTabs({
  data,
  viewModel,
  onPreviewOpen,
}: ScrapeResultContentTabsProps) {
  return (
    <Card>
      <Tabs defaultValue={viewModel.defaultTab}>
        <CardHeader className="pb-0">
          <TabsList>
            {viewModel.hasScreenshot && (
              <TabsTrigger value="screenshot" className="gap-1">
                <Image className="h-3.5 w-3.5" />
                Screenshot
              </TabsTrigger>
            )}
            {viewModel.hasMarkdown && (
              <TabsTrigger value="markdown" className="gap-1">
                <File className="h-3.5 w-3.5" />
                Markdown
              </TabsTrigger>
            )}
            {viewModel.hasHtml && (
              <TabsTrigger value="html" className="gap-1">
                <File className="h-3.5 w-3.5" />
                HTML
              </TabsTrigger>
            )}
            {viewModel.hasRawHtml && (
              <TabsTrigger value="rawHtml" className="gap-1">
                <File className="h-3.5 w-3.5" />
                Raw HTML
              </TabsTrigger>
            )}
            {viewModel.hasLinks && (
              <TabsTrigger value="links" className="gap-1">
                <Link className="h-3.5 w-3.5" />
                Links ({data.links?.length})
              </TabsTrigger>
            )}
            {viewModel.hasPdf && (
              <TabsTrigger value="pdf" className="gap-1">
                <File className="h-3.5 w-3.5" />
                PDF
              </TabsTrigger>
            )}
          </TabsList>
        </CardHeader>

        <CardContent className="pt-4">
          {viewModel.hasScreenshot && (
            <TabsContent value="screenshot" className="m-0">
              <div
                className="relative cursor-zoom-in border rounded-lg overflow-hidden bg-muted"
                onClick={onPreviewOpen}
              >
                <img src={viewModel.screenshotSrc} alt="Screenshot" className="w-full h-auto" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Click image to enlarge</p>
                {data.screenshot?.url && (
                  <a
                    href={data.screenshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Open in new tab
                  </a>
                )}
              </div>

              {data.screenshot && (
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Dimensions</span>
                    <p className="font-medium">
                      {data.screenshot.width} × {data.screenshot.height}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Format</span>
                    <p className="font-medium uppercase">{data.screenshot.format}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size</span>
                    <p className="font-medium">{formatFileSize(data.screenshot.fileSize)}</p>
                  </div>
                  {data.screenshot.expiresAt && (
                    <div>
                      <span className="text-muted-foreground">Expires</span>
                      <p className="font-medium">
                        {new Date(data.screenshot.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )}

          {viewModel.hasMarkdown && (
            <TabsContent value="markdown" className="m-0">
              <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                {data.markdown}
              </pre>
            </TabsContent>
          )}

          {viewModel.hasHtml && (
            <TabsContent value="html" className="m-0">
              <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                {data.html}
              </pre>
            </TabsContent>
          )}

          {viewModel.hasRawHtml && (
            <TabsContent value="rawHtml" className="m-0">
              <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                {data.rawHtml}
              </pre>
            </TabsContent>
          )}

          {viewModel.hasLinks && (
            <TabsContent value="links" className="m-0">
              <div className="overflow-auto max-h-96 space-y-1">
                {data.links?.map((link, index) => (
                  <a
                    key={`${link}-${index}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted text-xs truncate"
                  >
                    <Link className="h-3 w-3 shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </TabsContent>
          )}

          {viewModel.hasPdf && (
            <TabsContent value="pdf" className="m-0">
              {data.pdf?.url ? (
                <a
                  href={data.pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 rounded-lg border hover:bg-muted"
                >
                  <File className="h-8 w-8" />
                  <div>
                    <p className="font-medium">Download PDF</p>
                    <p className="text-xs text-muted-foreground">Click to open</p>
                  </div>
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">PDF generated (base64)</p>
              )}
            </TabsContent>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
}
