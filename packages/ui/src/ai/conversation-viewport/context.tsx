/**
 * [PROVIDES]: ConversationViewportContext - assistant-ui 视口上下文对齐
 * [DEPENDS]: assistant-ui ThreadViewportContext
 * [POS]: Conversation Viewport 状态注入与访问入口（对齐 assistant-ui）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ReactNode } from 'react';

import {
  ThreadViewportContext as ConversationViewportContext,
  useThreadViewport as useConversationViewport,
  useThreadViewportStore as useConversationViewportStore,
} from '../assistant-ui/context/react/ThreadViewportContext';
import {
  ThreadPrimitiveViewportProvider as ConversationViewportProvider,
  type ThreadViewportProviderProps,
} from '../assistant-ui/context/providers/ThreadViewportProvider';

export type ConversationViewportProviderProps = ThreadViewportProviderProps & {
  children: ReactNode;
};

export {
  ConversationViewportContext,
  ConversationViewportProvider,
  useConversationViewport,
  useConversationViewportStore,
};
