/**
 * [PROPS]: MarkdownTableProps - 自定义 Streamdown 表格组件
 * [POS]: 替换 Streamdown 默认表格，点击直接复制 Markdown 格式（无二级菜单）
 * [UPDATE]: 2026-03-05 - 修复复制反馈 timer 生命周期：重复点击清理旧 timer，卸载时清理悬挂 timer
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '../lib/utils';

type TableData = { headers: string[]; rows: string[][] };

function extractTableData(table: HTMLTableElement): TableData {
  const headers: string[] = [];
  const rows: string[][] = [];

  for (const th of table.querySelectorAll('thead th')) {
    headers.push(th.textContent?.trim() || '');
  }

  for (const tr of table.querySelectorAll('tbody tr')) {
    const row: string[] = [];
    for (const td of tr.querySelectorAll('td')) {
      row.push(td.textContent?.trim() || '');
    }
    rows.push(row);
  }

  return { headers, rows };
}

function toMarkdown({ headers, rows }: TableData): string {
  if (headers.length === 0) return '';

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || '').length), 3)
  );

  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  const headerLine = '| ' + headers.map((h, i) => pad(h, widths[i]!)).join(' | ') + ' |';
  const separator = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
  const dataLines = rows.map(
    (row) => '| ' + row.map((cell, i) => pad(cell, widths[i]!)).join(' | ') + ' |'
  );

  return [headerLine, separator, ...dataLines].join('\n');
}

export function MarkdownTable({
  children,
  className,
  node: _node,
  ...props
}: ComponentProps<'table'> & { node?: unknown }) {
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const table = wrapperRef.current?.querySelector('table');
    if (!table || typeof window === 'undefined' || !navigator?.clipboard?.writeText) return;
    try {
      const md = toMarkdown(extractTableData(table));
      await navigator.clipboard.writeText(md);
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch {
      // ignore clipboard failure
    }
  }, []);

  return (
    <div className="group/table relative my-4" ref={wrapperRef} data-streamdown="table-wrapper">
      <div className="overflow-x-auto overscroll-y-auto" data-streamdown="table-scroll">
        <table
          className={cn('w-full border-collapse', className)}
          data-streamdown="table"
          {...props}
        >
          {children}
        </table>
      </div>

      <button
        aria-label="Copy as Markdown"
        className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border-muted/70 bg-background/80 p-0 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity duration-150 hover:text-foreground group-hover/table:opacity-100"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
