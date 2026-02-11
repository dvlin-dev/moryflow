/**
 * [DEFINES]: ChatAttachment, ChatMessageMeta, ChatMessageMetadata, ChatFileContextMetadata
 * [USED_BY]: Moryflow/Anyhunt 消息渲染与输入模块
 * [POS]: 跨产品共享的聊天消息/附件类型
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

export type ChatMessageMeta = {
  attachments?: ChatAttachment[];
  selectedSkill?: ChatSelectedSkill;
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
