/**
 * Scrape 结果展示组件
 */

import { useState } from 'react';
import {
  ArrowUpRight01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Timer01Icon,
  Globe02Icon,
  Image01Icon,
  File01Icon,
  Link01Icon,
} from '@hugeicons/core-free-icons';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@anyhunt/ui';
import { isScrapeError, type ScrapeResponse } from '@/features/playground-shared';

interface ScrapeResultProps {
  data: ScrapeResponse;
}

export function ScrapeResult({ data }: ScrapeResultProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // 错误处理
  if (isScrapeError(data)) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Icon icon={Cancel01Icon} className="h-5 w-5" />
            Scrape Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="font-mono text-sm">
              {data.error.code}: {data.error.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 同步完成 - 直接显示结果
  const hasScreenshot = data.screenshot?.url || data.screenshot?.base64;
  const hasPdf = data.pdf?.url || data.pdf?.base64;
  const hasMarkdown = Boolean(data.markdown);
  const hasHtml = Boolean(data.html);
  const hasRawHtml = Boolean(data.rawHtml);
  const hasLinks = data.links && data.links.length > 0;

  const screenshotSrc = data.screenshot?.base64
    ? `data:image/${data.screenshot.format || 'png'};base64,${data.screenshot.base64}`
    : data.screenshot?.url;

  return (
    <>
      <div className="space-y-4">
        {/* 状态卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon icon={CheckmarkCircle01Icon} className="h-5 w-5 text-green-600" />
              Scrape Successful
              {data.fromCache && (
                <Badge variant="secondary" className="ml-2">
                  From Cache
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon icon={Globe02Icon} className="h-4 w-4" />
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate max-w-md"
              >
                {data.url}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 内容展示 */}
        <Card>
          <Tabs defaultValue={hasScreenshot ? 'screenshot' : hasMarkdown ? 'markdown' : 'html'}>
            <CardHeader className="pb-0">
              <TabsList>
                {hasScreenshot && (
                  <TabsTrigger value="screenshot" className="gap-1">
                    <Icon icon={Image01Icon} className="h-3.5 w-3.5" />
                    Screenshot
                  </TabsTrigger>
                )}
                {hasMarkdown && (
                  <TabsTrigger value="markdown" className="gap-1">
                    <Icon icon={File01Icon} className="h-3.5 w-3.5" />
                    Markdown
                  </TabsTrigger>
                )}
                {hasHtml && (
                  <TabsTrigger value="html" className="gap-1">
                    <Icon icon={File01Icon} className="h-3.5 w-3.5" />
                    HTML
                  </TabsTrigger>
                )}
                {hasRawHtml && (
                  <TabsTrigger value="rawHtml" className="gap-1">
                    <Icon icon={File01Icon} className="h-3.5 w-3.5" />
                    Raw HTML
                  </TabsTrigger>
                )}
                {hasLinks && (
                  <TabsTrigger value="links" className="gap-1">
                    <Icon icon={Link01Icon} className="h-3.5 w-3.5" />
                    Links ({data.links?.length})
                  </TabsTrigger>
                )}
                {hasPdf && (
                  <TabsTrigger value="pdf" className="gap-1">
                    <Icon icon={File01Icon} className="h-3.5 w-3.5" />
                    PDF
                  </TabsTrigger>
                )}
              </TabsList>
            </CardHeader>

            <CardContent className="pt-4">
              {hasScreenshot && (
                <TabsContent value="screenshot" className="m-0">
                  <div
                    className="relative cursor-zoom-in border rounded-lg overflow-hidden bg-muted"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <img src={screenshotSrc} alt="Screenshot" className="w-full h-auto" />
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
                        <Icon icon={ArrowUpRight01Icon} className="h-3 w-3" />
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

              {hasMarkdown && (
                <TabsContent value="markdown" className="m-0">
                  <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                    {data.markdown}
                  </pre>
                </TabsContent>
              )}

              {hasHtml && (
                <TabsContent value="html" className="m-0">
                  <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                    {data.html}
                  </pre>
                </TabsContent>
              )}

              {hasRawHtml && (
                <TabsContent value="rawHtml" className="m-0">
                  <pre className="overflow-auto max-h-96 p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap">
                    {data.rawHtml}
                  </pre>
                </TabsContent>
              )}

              {hasLinks && (
                <TabsContent value="links" className="m-0">
                  <div className="overflow-auto max-h-96 space-y-1">
                    {data.links?.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted text-xs truncate"
                      >
                        <Icon icon={Link01Icon} className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </TabsContent>
              )}

              {hasPdf && (
                <TabsContent value="pdf" className="m-0">
                  {data.pdf?.url ? (
                    <a
                      href={data.pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-4 rounded-lg border hover:bg-muted"
                    >
                      <Icon icon={File01Icon} className="h-8 w-8" />
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

        {/* 时间统计 */}
        {data.timings && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon icon={Timer01Icon} className="h-4 w-4" />
                Timing Breakdown
                <span className="text-muted-foreground font-normal text-sm ml-auto">
                  Total: {data.timings.totalMs}ms
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <TimingBar
                  label="Queue Wait"
                  value={data.timings.queueWaitMs}
                  total={data.timings.totalMs || 1}
                  color="bg-slate-400"
                />
                <TimingBar
                  label="Fetch"
                  value={data.timings.fetchMs}
                  total={data.timings.totalMs || 1}
                  color="bg-blue-500"
                />
                <TimingBar
                  label="Render"
                  value={data.timings.renderMs}
                  total={data.timings.totalMs || 1}
                  color="bg-green-500"
                />
                <TimingBar
                  label="Transform"
                  value={data.timings.transformMs}
                  total={data.timings.totalMs || 1}
                  color="bg-amber-500"
                />
                <TimingBar
                  label="Screenshot"
                  value={data.timings.screenshotMs}
                  total={data.timings.totalMs || 1}
                  color="bg-purple-500"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 全屏预览 */}
      {hasScreenshot && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-auto">
            <img src={screenshotSrc} alt="Screenshot Preview" className="w-full h-auto" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function TimingBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value?: number;
  total: number;
  color: string;
}) {
  if (value === undefined || value === null) return null;

  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}ms</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
