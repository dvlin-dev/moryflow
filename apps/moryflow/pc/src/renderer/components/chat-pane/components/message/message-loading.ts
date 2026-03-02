/**
 * [PROVIDES]: shouldShowAssistantLoadingPlaceholder/shouldRenderAssistantMessage/resolveLastVisibleAssistantIndex
 * [DEPENDS]: @moryflow/agents-runtime/ui-message/assistant-placeholder-policy
 * [POS]: ChatMessage 渲染前判定适配层（复用共享占位策略事实源）
 * [UPDATE]: 2026-03-01 - 新增 resolveLastVisibleAssistantIndex，按可见 assistant 计算最后一条，避免隐藏占位后丢失 retry
 * [UPDATE]: 2026-03-01 - assistant 仅含 file part 时不再被判定为空消息隐藏；loading 只在运行态占位显示
 * [UPDATE]: 2026-03-01 - 新增运行态约束，仅最后一条流式 assistant 允许显示 loading
 * [UPDATE]: 2026-03-02 - 实现改为直接复用 agents-runtime 共享策略，移除 PC 本地状态判定重复实现
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export {
  resolveLastVisibleAssistantIndex,
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from '@moryflow/agents-runtime/ui-message/assistant-placeholder-policy';
