import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';
import type { ActivityLog } from '@/types/api';
import { LogCategoryBadge, LogLevelBadge } from './log-badges';

interface LogDetailDialogProps {
  log: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogDetailDialog({ log, open, onOpenChange }: LogDetailDialogProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>日志详情</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">操作时间</p>
              <p className="mt-1">{formatDateTime(log.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">分类 / 动作</p>
              <div className="mt-1 flex gap-2">
                <LogCategoryBadge category={log.category} />
                <Badge variant="outline">{log.action}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">用户</p>
              <p className="mt-1">{log.userEmail}</p>
              <p className="text-xs text-muted-foreground font-mono">{log.userId}</p>
            </div>
            {log.targetUserEmail && (
              <div>
                <p className="text-sm text-muted-foreground">目标用户</p>
                <p className="mt-1">{log.targetUserEmail}</p>
                <p className="text-xs text-muted-foreground font-mono">{log.targetUserId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">级别</p>
              <div className="mt-1">
                <LogLevelBadge level={log.level} />
              </div>
            </div>
            {log.duration && (
              <div>
                <p className="text-sm text-muted-foreground">耗时</p>
                <p className="mt-1">{log.duration} ms</p>
              </div>
            )}
            {log.ip && (
              <div>
                <p className="text-sm text-muted-foreground">IP</p>
                <p className="mt-1 font-mono text-sm">{log.ip}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">详情</p>
            {log.details ? (
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono max-h-64 overflow-y-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">无详情数据</p>
            )}
          </div>
          {log.userAgent && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">User-Agent</p>
              <p className="text-xs text-muted-foreground font-mono break-all">{log.userAgent}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
