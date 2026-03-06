/**
 * [PROPS]: EmbedProps
 * [EMITS]: onLoad, onError
 * [POS]: 通用嵌入渲染组件（支持 html/photo/link fallback）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
 */

'use client';

import { useEffect, type ReactNode } from 'react';
import type { EmbedData, EmbedOptions, EmbedError } from '@moryflow/embed';
import { useEmbed } from '../hooks/useEmbed';
import { EmbedSkeleton } from './EmbedSkeleton';

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

export function Embed({ url, fallback, onLoad, onError, className, ...options }: EmbedProps) {
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
    return <>{fallback ?? <EmbedSkeleton className={className} />}</>;
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

  if (data?.html) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: data.html }} />;
  }

  if (data?.type === 'photo' && data.url) {
    return (
      <img
        className={className}
        src={data.url}
        alt={data.title ?? data.provider_name ?? 'Embedded content'}
        width={data.width}
        height={data.height}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    );
  }

  if (data) {
    const linkHref = data.url ?? data.provider_url ?? url;
    const linkLabel = data.title ?? data.provider_name ?? linkHref;
    return (
      <a className={className} href={linkHref} target="_blank" rel="noreferrer">
        {linkLabel}
      </a>
    );
  }

  return null;
}
