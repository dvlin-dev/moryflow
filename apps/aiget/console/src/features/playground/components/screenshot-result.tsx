/**
 * 截图结果展示组件
 */
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  Badge,
} from '@aiget/ui/primitives'
import { CheckCircle, Globe, ExternalLink, Timer } from 'lucide-react'
import type { ScreenshotData } from '../types'

interface ScreenshotResultProps {
  data: ScreenshotData
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ScreenshotResult({ data }: ScreenshotResultProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <div className="space-y-4">
        {/* 图片预览 - 主要展示区域 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Screenshot Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative cursor-zoom-in border rounded-none overflow-hidden bg-muted"
              onClick={() => setPreviewOpen(true)}
            >
              <img
                src={data.url}
                alt="Screenshot"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Click image to enlarge
              </p>
              {!data.url.startsWith('data:') && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in new tab
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 响应详情 */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Dimensions</span>
                <p className="font-medium">{data.width} × {data.height}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Format</span>
                <p><Badge variant="secondary">{data.format.toUpperCase()}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Size</span>
                <p className="font-medium">{formatFileSize(data.fileSize)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Processing</span>
                <p className="font-medium">{data.processingMs} ms</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Cache</span>
                <p>
                  <Badge variant={data.fromCache ? 'default' : 'outline'}>
                    {data.fromCache ? 'Hit' : 'Miss'}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">ID</span>
                <p className="font-mono text-xs truncate" title={data.id}>{data.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 时间统计 - 仅当有 timings 数据时显示 */}
        {data.timings && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-4 w-4" />
                Timing Breakdown
                <span className="text-muted-foreground font-normal text-sm ml-auto">
                  Total: {data.timings.totalMs}ms
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TimingBar
                  label="Queue Wait"
                  value={data.timings.queueWaitMs}
                  total={data.timings.totalMs}
                  color="bg-slate-400"
                />
                <TimingBar
                  label="Page Load"
                  value={data.timings.pageLoadMs}
                  total={data.timings.totalMs}
                  color="bg-blue-500"
                />
                <TimingBar
                  label="Capture"
                  value={data.timings.captureMs}
                  total={data.timings.totalMs}
                  color="bg-green-500"
                />
                <TimingBar
                  label="Image Process"
                  value={data.timings.imageProcessMs}
                  total={data.timings.totalMs}
                  color="bg-amber-500"
                />
                <TimingBar
                  label="Upload"
                  value={data.timings.uploadMs}
                  total={data.timings.totalMs}
                  color="bg-purple-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 页面元信息 */}
        {data.meta && (data.meta.title || data.meta.description) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Page Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {data.meta.title && (
                  <div>
                    <span className="text-muted-foreground text-xs">Title</span>
                    <p className="font-medium">{data.meta.title}</p>
                  </div>
                )}
                {data.meta.description && (
                  <div>
                    <span className="text-muted-foreground text-xs">Description</span>
                    <p className="text-muted-foreground text-xs line-clamp-2">
                      {data.meta.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 全屏预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-auto">
          <img
            src={data.url}
            alt="Screenshot Preview"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// 时间统计条组件
function TimingBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value?: number
  total: number
  color: string
}) {
  if (value === undefined || value === null) return null

  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}ms</span>
      </div>
      <div className="h-2 bg-muted rounded-none overflow-hidden">
        <div
          className={`h-full ${color} rounded-none transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
