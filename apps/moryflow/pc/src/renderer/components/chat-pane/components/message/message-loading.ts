/**
 * [PROVIDES]: shouldShowAssistantLoadingPlaceholder/shouldRenderAssistantMessage/resolveLastVisibleAssistantIndex
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/assistant-placeholder-policy
 * [POS]: ChatMessage 渲染前判定适配层（复用共享占位策略事实源）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export {
  resolveLastVisibleAssistantIndex,
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
  shouldShowStreamingTail,
} from '@moryflow/agents-runtime/ui-message/assistant-placeholder-policy';
