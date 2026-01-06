/**
 * EmbedSkeleton - 加载骨架屏
 */
export interface EmbedSkeletonProps {
  /** 宽度 */
  width?: number | string;
  /** 高度 */
  height?: number | string;
  /** 自定义类名 */
  className?: string;
}

export function EmbedSkeleton({
  width = '100%',
  height = 200,
  className,
}: EmbedSkeletonProps) {
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
