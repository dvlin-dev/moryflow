import type { ChatStatus, FileUIPart } from 'ai';

import type { PromptInputProps } from '@moryflow/ui/ai/prompt-input';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { TokenUsage, ChatSessionSummary } from '@shared/ipc';
import type { ChatSelectedSkill } from '@moryflow/types';
import type { ModelThinkingProfile } from '@shared/model-registry';

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
  /**
   * 本次发送显式选择的 skill 名称。
   * - `undefined`: 使用当前全局 selected skill
   * - `null`: 强制本次不带 selected skill
   */
  selectedSkillName?: string | null;
  /** 本次发送显式选择的 skill 元数据（用于消息渲染） */
  selectedSkill?: ChatSelectedSkill | null;
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
  selectedThinkingLevel?: string | null;
  selectedThinkingProfile?: ModelThinkingProfile;
  onSelectThinkingLevel: (level: string) => void;
  disabled?: boolean;
  onOpenSettings?: (section?: SettingsSection) => void;
  /** 当前会话的 token 使用量 */
  tokenUsage?: TokenUsage | null;
  /** 当前模型的 context window 大小 */
  contextWindow?: number;
  /** 会话级访问模式 */
  mode: ChatSessionSummary['mode'];
  /** 切换访问模式 */
  onModeChange: (mode: ChatSessionSummary['mode']) => void;
  /** 当前显式选中的 skill（输入框 chip） */
  selectedSkillName?: string | null;
  /** 选择或清空输入框显式 skill */
  onSelectSkillName?: (name: string | null) => void;
};
