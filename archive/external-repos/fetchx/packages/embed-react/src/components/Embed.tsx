/**
 * Embed - 通用嵌入组件
 */
import { useEffect, type ReactNode } from 'react';
import type { EmbedData, EmbedOptions } from '@aiget/embed';
import { type EmbedError } from '@aiget/embed';
import { useEmbed } from '../hooks/useEmbed.ts';
import { EmbedSkeleton } from './EmbedSkeleton.tsx';

export interface EmbedProps extends EmbedOptions {
  /** 要嵌入的 URL */
  url: string;
  /** 加载中显示的内容 */
  fallback?: ReactNode;
  /** 加载完成回调 */
  onLoad?: (data: EmbedData) => void;
  /** 加载失败回调 */
  onError?: (error: EmbedError) => void;
  /** 容器类名 */
  className?: string;
}

export function Embed({
  url,
  fallback,
  onLoad,
  onError,
  className,
  ...options
}: EmbedProps) {
  const { data, isLoading, error } = useEmbed(url, options);

  // 使用 useEffect 处理回调，避免在 render 中产生副作用
  useEffect(() => {
    if (data && onLoad) {
      onLoad(data);
    }
  }, [data, onLoad]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  if (isLoading) {
    return <>{fallback ?? <EmbedSkeleton />}</>;
  }

  if (error) {
    return (
      <div
        className={className}
        style={{
          padding: 16,
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          color: '#991b1b',
        }}
      >
        <strong>Error:</strong> {error.message}
      </div>
    );
  }

  if (!data?.html) {
    return null;
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
