/**
 * 截图详情对话框
 */
import {
  ArrowUpRight01Icon,
  Clock01Icon,
  Globe02Icon,
  Image01Icon,
} from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Icon, Skeleton } from '@aiget/ui';
import { formatRelativeTime } from '@aiget/ui/lib';
import type { Screenshot } from '../types';
import { SCREENSHOT_STATUS_CONFIG } from '../constants';

interface ScreenshotDetailDialogProps {
  screenshot: Screenshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScreenshotDetailDialog({
  screenshot,
  open,
  onOpenChange,
}: ScreenshotDetailDialogProps) {
  if (!screenshot) return null;

  const statusConfig = SCREENSHOT_STATUS_CONFIG[screenshot.status] ?? {
    label: screenshot.status,
    variant: 'outline' as const,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon={Image01Icon} className="h-5 w-5" />
            Screenshot Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 预览图 */}
          {screenshot.fileUrl && screenshot.status === 'COMPLETED' ? (
            <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
              <img
                src={screenshot.fileUrl}
                alt={screenshot.pageTitle || screenshot.url}
                className="h-full w-full object-contain"
              />
            </div>
          ) : screenshot.status === 'PROCESSING' || screenshot.status === 'PENDING' ? (
            <Skeleton className="aspect-video w-full rounded-lg" />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
              <span className="text-sm text-muted-foreground">Screenshot failed</span>
            </div>
          )}

          {/* 信息列表 */}
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">URL</span>
              <a
                href={screenshot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate text-right text-primary hover:underline"
              >
                {screenshot.url}
                <Icon icon={ArrowUpRight01Icon} className="h-3 w-3 shrink-0" />
              </a>
            </div>

            {screenshot.pageTitle && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Page Title</span>
                <span className="truncate text-right">{screenshot.pageTitle}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="flex items-center gap-1">
                <Icon icon={Clock01Icon} className="h-3 w-3" />
                {formatRelativeTime(screenshot.createdAt)}
              </span>
            </div>

            {screenshot.processingMs && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Processing Time</span>
                <span>{screenshot.processingMs}ms</span>
              </div>
            )}

            {screenshot.fileSize && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">File Size</span>
                <span>{(screenshot.fileSize / 1024).toFixed(1)} KB</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cache Hit</span>
              <span>{screenshot.fromCache ? 'Yes' : 'No'}</span>
            </div>

            {screenshot.error && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Error</span>
                <span className="truncate text-right text-destructive">{screenshot.error}</span>
              </div>
            )}
          </div>

          {/* 打开原图 */}
          {screenshot.fileUrl && (
            <a
              href={screenshot.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              <Icon icon={Globe02Icon} className="h-4 w-4" />
              Open original in new tab
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
