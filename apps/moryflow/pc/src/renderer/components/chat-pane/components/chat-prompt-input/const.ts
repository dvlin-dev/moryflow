import type { ChatStatus, FileUIPart } from 'ai';

import type { PromptInputProps } from '@anyhunt/ui/ai/prompt-input';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { PlanSnapshot, TokenUsage, ChatSessionSummary } from '@shared/ipc';

import type { ModelGroup } from '../../models';
import type { MessageAttachment } from '../../types/attachment';

export const TEXTUAL_MEDIA_TYPES = [/^text\//i, /json/i, /xml/i, /yaml/i, /javascript/i, /\+json/i];
export const PREVIEW_CHAR_LIMIT = 2_000;

/**
 * 扩展的提交消息类型
 * - text: 处理后的文本（可能包含 [Referenced files: ...] 标记）
 * - files: 嵌入的文件（图片、上传文件等）
 * - attachments: 结构化附件数据（用于存储和展示）
 */
export type ChatSubmitPayload = {
  /** 处理后的文本（file-ref 类型已拼接到末尾） */
  text: string;
  /** 嵌入的文件（来自 buildAIRequest） */
  files: FileUIPart[];
  /** 结构化附件数据（用于存储到消息元数据） */
  attachments: MessageAttachment[];
};

export type ChatPromptInputProps = Pick<PromptInputProps, 'onError'> & {
  status: ChatStatus;
  onSubmit: (payload: ChatSubmitPayload) => void | Promise<void>;
  onStop: () => void;
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  vaultPath?: string | null;
  modelGroups: ModelGroup[];
  selectedModelId?: string | null;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  onOpenSettings?: (section?: SettingsSection) => void;
  todoSnapshot?: PlanSnapshot | null;
  /** 当前会话的 token 使用量 */
  tokenUsage?: TokenUsage | null;
  /** 当前模型的 context window 大小 */
  contextWindow?: number;
  /** 会话级访问模式 */
  mode: NonNullable<ChatSessionSummary['mode']>;
  /** 切换访问模式 */
  onModeChange: (mode: NonNullable<ChatSessionSummary['mode']>) => void;
};
