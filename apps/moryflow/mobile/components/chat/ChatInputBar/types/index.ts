/**
 * [PROVIDES]: 类型导出
 * [USED_BY]: ChatInputBar 及其子组件, MessageAttachments, MessageBubble
 */

// 附件类型
export type {
  FileRefAttachment,
  FileEmbedAttachment,
  ImageAttachment,
  MessageAttachment,
  ImplementedAttachment,
} from './attachment';

export { isFileRef, isFileEmbed, isImage, createFileRefAttachment } from './attachment';

// 消息元数据
export type { ChatMessageMeta } from './message';

export { getMessageMeta, createMessageMetadata } from './message';
