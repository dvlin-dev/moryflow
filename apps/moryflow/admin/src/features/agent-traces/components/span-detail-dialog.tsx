/**
 * Span 详情对话框
 * 用于显示失败 Tool 的详细信息
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CircleCheck, Copy } from 'lucide-react';
import { formatDateTime, formatDuration } from '@/lib/format';
import { SpanStatusBadge, ErrorTypeBadge } from './trace-status-badge';
import type { AgentSpan } from '../types';

interface SpanDetailDialogProps {
  span: AgentSpan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 生成可复制的错误报告 */
function buildErrorReport(span: AgentSpan): string {
  const lines: string[] = [
    '## Tool 执行失败报告',
    '',
    `**Tool**: ${span.name}`,
    `**Agent**: ${span.trace?.agentName ?? '-'}`,
    `**User**: ${span.trace?.user?.email ?? '-'}`,
    `**Time**: ${formatDateTime(span.startedAt)}`,
    `**Duration**: ${formatDuration(span.duration)}`,
  ];

  if (span.status === 'failed') {
    lines.push('', '### Error');
    if (span.errorType) {
      lines.push(`**Type**: ${span.errorType}`);
    }
    if (span.errorMessage) {
      lines.push('', '**Message**:', '```', span.errorMessage, '```');
    }
    if (span.errorStack) {
      lines.push('', '**Stack**:', '```', span.errorStack, '```');
    }
  }

  if (span.input !== undefined && span.input !== null) {
    lines.push('', '### Input', '```json', JSON.stringify(span.input, null, 2), '```');
  }

  if (span.output !== undefined && span.output !== null) {
    lines.push('', '### Output', '```json', JSON.stringify(span.output, null, 2), '```');
  }

  return lines.join('\n');
}

export function SpanDetailDialog({ span, open, onOpenChange }: SpanDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!span) return null;

  const handleCopy = async () => {
    const report = buildErrorReport(span);
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono">{span.name}</span>
              <SpanStatusBadge status={span.status} />
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} className="ml-4">
              {copied ? (
                <>
                  <CircleCheck className="h-4 w-4 mr-1.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">类型</p>
              <p className="mt-1">{span.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">耗时</p>
              <p className="mt-1 font-mono">{formatDuration(span.duration)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agent</p>
              <p className="mt-1 font-mono">{span.trace?.agentName ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">用户</p>
              <p className="mt-1">{span.trace?.user?.email ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">开始时间</p>
              <p className="mt-1">{formatDateTime(span.startedAt)}</p>
            </div>
            {span.endedAt && (
              <div>
                <p className="text-sm text-muted-foreground">结束时间</p>
                <p className="mt-1">{formatDateTime(span.endedAt)}</p>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {span.status === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">错误类型</span>
                <ErrorTypeBadge errorType={span.errorType} />
              </div>

              {span.errorMessage && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">错误消息</p>
                  <pre className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-red-800 dark:text-red-200">
                    {span.errorMessage}
                  </pre>
                </div>
              )}

              {span.errorStack && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">错误堆栈</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto">
                    {span.errorStack}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 输入参数 */}
          {span.input !== undefined && span.input !== null && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">输入参数</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono">
                {String(JSON.stringify(span.input, null, 2))}
              </pre>
            </div>
          )}

          {/* 输出结果 */}
          {span.output !== undefined && span.output !== null && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">输出结果</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono">
                {String(JSON.stringify(span.output, null, 2))}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
