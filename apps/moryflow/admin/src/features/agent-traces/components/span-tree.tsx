/**
 * Span 树形视图
 * 展示 Agent 执行链路
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowLeftRight, ArrowRight, Bot, Shield, Wrench, Zap } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { SpanStatusBadge } from './trace-status-badge';
import type { AgentSpan, SpanType } from '../types';

interface SpanTreeProps {
  spans: AgentSpan[];
  onSelectSpan?: (span: AgentSpan) => void;
  selectedSpanId?: string;
}

interface SpanNode extends AgentSpan {
  children: SpanNode[];
}

// Span 类型图标
const SPAN_TYPE_ICONS: Record<SpanType, React.ReactNode> = {
  agent: <Bot className="h-4 w-4 text-blue-500" />,
  function: <Wrench className="h-4 w-4 text-cyan-500" />,
  generation: <Zap className="h-4 w-4 text-purple-500" />,
  handoff: <ArrowLeftRight className="h-4 w-4 text-orange-500" />,
  guardrail: <Shield className="h-4 w-4 text-yellow-500" />,
  custom: <Wrench className="h-4 w-4 text-gray-500" />,
};

// 构建树形结构
function buildTree(spans: AgentSpan[]): SpanNode[] {
  const spanMap = new Map<string, SpanNode>();
  const roots: SpanNode[] = [];

  // 先创建所有节点
  for (const span of spans) {
    spanMap.set(span.spanId, { ...span, children: [] });
  }

  // 建立父子关系
  for (const span of spans) {
    const node = spanMap.get(span.spanId)!;
    if (span.parentSpanId && spanMap.has(span.parentSpanId)) {
      spanMap.get(span.parentSpanId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface SpanNodeItemProps {
  node: SpanNode;
  depth: number;
  onSelect?: (span: AgentSpan) => void;
  selectedSpanId?: string;
}

function SpanNodeItem({ node, depth, onSelect, selectedSpanId }: SpanNodeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.spanId === selectedSpanId;
  const isFailed = node.status === 'failed';

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
          isSelected && 'bg-muted',
          isFailed && 'bg-red-50 dark:bg-red-950/30'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect?.(node)}
      >
        {/* 展开/收起按钮 */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ArrowDown className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* 类型图标 */}
        {SPAN_TYPE_ICONS[node.type as SpanType] ?? SPAN_TYPE_ICONS.custom}

        {/* 名称 */}
        <span className="font-mono text-sm flex-1 truncate">{node.name}</span>

        {/* 状态 */}
        <SpanStatusBadge status={node.status} />

        {/* 耗时 */}
        <span className="text-xs text-muted-foreground font-mono w-16 text-right">
          {formatDuration(node.duration)}
        </span>
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <SpanNodeItem
              key={child.spanId}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedSpanId={selectedSpanId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpanTree({ spans, onSelectSpan, selectedSpanId }: SpanTreeProps) {
  const tree = buildTree(spans);

  if (spans.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">暂无执行记录</div>;
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <SpanNodeItem
          key={node.spanId}
          node={node}
          depth={0}
          onSelect={onSelectSpan}
          selectedSpanId={selectedSpanId}
        />
      ))}
    </div>
  );
}
