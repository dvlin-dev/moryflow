/**
 * [PROVIDES]: ConversationViewport Store - assistant-ui 对齐
 * [DEPENDS]: assistant-ui ThreadViewport store
 * [POS]: Conversation Viewport 交互状态（对齐 assistant-ui）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ThreadViewportState, ThreadViewportStoreOptions } from '../assistant-ui/context/stores/ThreadViewport';
import { makeThreadViewportStore } from '../assistant-ui/context/stores/ThreadViewport';

export type ConversationViewportState = ThreadViewportState;
export type ConversationViewportStoreOptions = ThreadViewportStoreOptions;

export const createConversationViewportStore = (options?: ConversationViewportStoreOptions) =>
  makeThreadViewportStore(options);
