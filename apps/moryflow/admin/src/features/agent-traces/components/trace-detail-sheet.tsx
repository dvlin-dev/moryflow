/**
 * Trace 详情抽屉
 */

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleCheck, Copy } from 'lucide-react';
import { formatDateTime, formatDuration, formatTokens } from '@/lib/format';
import { TraceStatusBadge, SpanStatusBadge, ErrorTypeBadge } from './trace-status-badge';
import { SpanTree } from './span-tree';
import { useTraceDetail } from '../hooks';
import type { AgentSpan } from '../types';

interface TraceDetailSheetProps {
  traceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? <CircleCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

interface SpanDetailPanelProps {
  span: AgentSpan;
}

function SpanDetailPanel({ span }: SpanDetailPanelProps) {
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{span.name}</span>
        <SpanStatusBadge status={span.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">类型</p>
          <p className="mt-1">{span.type}</p>
        </div>
        <div>
          <p className="text-muted-foreground">耗时</p>
          <p className="mt-1 font-mono">{formatDuration(span.duration)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">开始时间</p>
          <p className="mt-1">{formatDateTime(span.startedAt)}</p>
        </div>
        {span.endedAt && (
          <div>
            <p className="text-muted-foreground">结束时间</p>
            <p className="mt-1">{formatDateTime(span.endedAt)}</p>
          </div>
        )}
      </div>

      {span.status === 'failed' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">错误类型</span>
            <ErrorTypeBadge errorType={span.errorType} />
          </div>
          {span.errorMessage && (
            <div>
              <p className="text-muted-foreground text-sm mb-1">错误消息</p>
              <pre className="text-xs bg-red-50 dark:bg-red-950/30 p-2 rounded overflow-x-auto whitespace-pre-wrap text-red-800 dark:text-red-200">
                {span.errorMessage}
              </pre>
            </div>
          )}
        </div>
      )}

      {span.input !== undefined && span.input !== null && (
        <div>
          <p className="text-muted-foreground text-sm mb-1">输入参数</p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
            {String(JSON.stringify(span.input, null, 2))}
          </pre>
        </div>
      )}

      {span.output !== undefined && span.output !== null && (
        <div>
          <p className="text-muted-foreground text-sm mb-1">输出结果</p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
            {String(JSON.stringify(span.output, null, 2))}
          </pre>
        </div>
      )}
    </div>
  );
}

export function TraceDetailSheet({ traceId, open, onOpenChange }: TraceDetailSheetProps) {
  const { data: trace, isLoading } = useTraceDetail(traceId);
  const [selectedSpan, setSelectedSpan] = useState<AgentSpan | null>(null);

  const handleClose = () => {
    setSelectedSpan(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[720px] sm:max-w-[720px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            Trace 详情
            {trace && (
              <span className="font-mono text-sm text-muted-foreground">
                {trace.traceId.slice(0, 16)}...
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : trace ? (
          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="overview">概要</TabsTrigger>
              <TabsTrigger value="spans">执行链路</TabsTrigger>
              <TabsTrigger value="raw">原始数据</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-140px)]">
              <TabsContent value="overview" className="px-6 py-4 space-y-6 mt-0">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Agent</p>
                    <p className="font-mono">{trace.agentName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">状态</p>
                    <TraceStatusBadge status={trace.status} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">执行轮次</p>
                    <p className="font-mono">{trace.turnCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Token 消耗</p>
                    <p className="font-mono">{formatTokens(trace.totalTokens)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">开始时间</p>
                    <p>{formatDateTime(trace.startedAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">总耗时</p>
                    <p className="font-mono">{formatDuration(trace.duration)}</p>
                  </div>
                </div>

                {/* 用户信息 */}
                {trace.user && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">用户</p>
                    <p>{trace.user.email}</p>
                    <p className="text-xs text-muted-foreground font-mono">{trace.user.id}</p>
                  </div>
                )}

                {/* 错误信息 */}
                {trace.status === 'failed' && trace.errorMessage && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">错误信息</p>
                    <pre className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg overflow-x-auto text-red-800 dark:text-red-200">
                      {trace.errorMessage}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="spans" className="px-6 py-4 mt-0">
                <div className="flex gap-4">
                  {/* Span 树 */}
                  <div className="flex-1 min-w-0">
                    <SpanTree
                      spans={trace.spans ?? []}
                      onSelectSpan={setSelectedSpan}
                      selectedSpanId={selectedSpan?.spanId}
                    />
                  </div>
                </div>

                {/* 选中的 Span 详情 */}
                {selectedSpan && (
                  <div className="mt-4">
                    <SpanDetailPanel span={selectedSpan} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raw" className="px-6 py-4 mt-0">
                <div className="relative">
                  <div className="absolute top-2 right-2">
                    <CopyButton text={JSON.stringify(trace, null, 2)} />
                  </div>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                    {JSON.stringify(trace, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : (
          <div className="p-6 text-center text-muted-foreground">Trace 不存在</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
