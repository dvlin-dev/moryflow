/**
 * [PROPS]: EmbedSkeletonProps
 * [EMITS]: none
 * [POS]: Embed loading skeleton
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';
export interface EmbedSkeletonProps {
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义类名 */
  className?: string;
}

export function EmbedSkeleton({ width = '100%', height = 200, className }: EmbedSkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}
