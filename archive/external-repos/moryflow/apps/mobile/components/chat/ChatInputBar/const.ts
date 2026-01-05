/**
 * [DEFINES]: ChatInputBarProps, ModelOption, VoiceState, SendMessagePayload
 * [USED_BY]: ChatInputBar 及其子组件
 * [POS]: 聊天输入栏类型定义和常量
 */

// ==================== 类型定义 ====================

export interface ModelOption {
  id: string
  name: string
}

/** 发送消息的 payload */
export interface SendMessagePayload {
  /** 处理后的文本（含 [Referenced files: ...] 标记） */
  text: string
  /** 附件元数据（用于存储和展示） */
  metadata?: Record<string, unknown>
}

export interface ChatInputBarProps {
  input: string
  onInputChange: (text: string) => void
  /** 发送消息 */
  onSend: (payload: SendMessagePayload) => void
  onStop?: () => void
  isLoading?: boolean
  isInitialized?: boolean
  onAddContext?: () => void
  /** 模型列表 */
  models?: ModelOption[]
  /** 当前选中的模型 ID */
  currentModelId?: string
  /** 模型名称（显示用） */
  currentModel?: string
  /** 模型变更回调 */
  onModelChange?: (modelId: string) => void
  /** 是否在 Sheet 中使用（不需要底部安全区域） */
  isInSheet?: boolean
  /** 禁用底部内边距（当使用外部容器管理布局时） */
  disableBottomPadding?: boolean
}

export interface VoiceState {
  isVoiceMode: boolean
  isTranscribing: boolean
  isRecording: boolean
  meteringLevels: number[]
  formattedDuration: string
}
