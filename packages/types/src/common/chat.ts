/**
 * [DEFINES]: ChatAttachment, ChatMessageMeta, ChatMessageMetadata, ChatFileContextMetadata
 * [USED_BY]: Moryflow/Anyhunt 消息渲染与输入模块
 * [POS]: 跨产品共享的聊天消息/附件类型
 * [UPDATE]: 2026-03-03 - ChatMessageMeta 新增 selectionReference，支持用户消息回显选中文本胶囊
 * [UPDATE]: 2026-03-06 - ChatMessageMeta 新增 assistantRound，统一轮次折叠时长元数据
 */

export type ChatAttachment =
  | {
      id: string;
      type: 'file-ref';
      path: string;
      name: string;
      extension: string;
    }
  | {
      id: string;
      type: 'file-embed';
      name: string;
      mediaType: string;
      content: string;
      size?: number;
    }
  | {
      id: string;
      type: 'image';
      url: string;
      mediaType: string;
      alt?: string;
      filename?: string;
    };

export type ChatSelectedSkill = {
  name: string;
  title?: string;
};

export type ChatSelectionReference = {
  preview: string;
  filePath: string;
  charCount: number;
  isTruncated: boolean;
};

export type ChatAssistantRoundMeta = {
  version: 1;
  roundId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  processCount: number;
};

export type ChatMessageMeta = {
  attachments?: ChatAttachment[];
  selectedSkill?: ChatSelectedSkill;
  selectionReference?: ChatSelectionReference;
  assistantRound?: ChatAssistantRoundMeta;
};

export type ChatMessageMetadata = {
  chat?: ChatMessageMeta;
  [key: string]: unknown;
};

export type ChatFileContextMetadata = {
  usedAsContext?: boolean;
  preview?: string;
  previewTruncated?: boolean;
};

export type ChatFileProviderMetadata = {
  chat?: ChatFileContextMetadata;
  [key: string]: unknown;
};
