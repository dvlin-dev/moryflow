/**
 * Reasoning 组件类型和常量定义
 */

/** 流式结束后自动折叠延迟（毫秒） */
export const AUTO_CLOSE_DELAY = 1000

/** Reasoning 组件 Props */
export interface ReasoningProps {
  content: string
  isStreaming?: boolean
  defaultOpen?: boolean
}
