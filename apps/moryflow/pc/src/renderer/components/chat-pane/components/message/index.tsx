/**
 * [PROPS]: ChatMessageProps - 单条聊天消息渲染参数
 * [EMITS]: onEditAndResend/onResend/onRetry/onFork
 * [POS]: Chat Pane 消息内容渲染（Lucide 图标）
 * [UPDATE]: 2026-02-26 - tool labels/callbacks 下沉到 useMessageToolModel
 * [UPDATE]: 2026-02-26 - MessageBody 改为分组模型（view/edit/tool），降低 props 透传噪音
 * [UPDATE]: 2026-02-26 - 拆分为 message-body/tool-part/message-actions，降低单文件职责耦合
 * [UPDATE]: 2026-03-03 - 用户消息引用胶囊统一复用输入区 FileChip 样式（readonly），实现输入区/消息区视觉一致
 * [UPDATE]: 2026-03-03 - 截断提示胶囊改为复用 `ChipHintBadge`，与输入区统一样式事实源
 * [UPDATE]: 2026-03-01 - assistant 空消息仅在运行态最后一条时显示 loading；file-only assistant 不再被误隐藏
 * [UPDATE]: 2026-02-10 - STREAMDOWN_ANIM 标记：全局检索点（动画 gating + 最后 text part 定位）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { File, Quote, Wrench } from 'lucide-react';
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageMetaAttachments,
  cleanFileRefMarker,
  findLastTextPartIndex,
  splitMessageParts,
} from '@moryflow/ui/ai/message';
import type { ChatAttachment } from '@moryflow/types';
import { useTranslation } from '@/lib/i18n';

import { getMessageMeta } from '../../types/message';
import { ChipHintBadge, FileChip } from '../context-file-tags';
import type { ChatMessageProps } from './const';
import { useMessageEdit } from './use-message-edit';
import { MessageBody } from './message-body';
import { MessageActionsLayer } from './message-actions';
import type { MessageBodyModel } from './message-body-model';
import { useMessageToolModel } from './use-message-tool-model';
import {
  shouldRenderAssistantMessage,
  shouldShowAssistantLoadingPlaceholder,
} from './message-loading';

type FileRefMetaAttachment = Extract<ChatAttachment, { type: 'file-ref' }>;

const isFileRefMetaAttachment = (attachment: ChatAttachment): attachment is FileRefMetaAttachment =>
  attachment.type === 'file-ref';

export const ChatMessage = ({
  message,
  messageIndex,
  status,
  isLastAssistant,
  isLastMessage,
  actions,
  onToolApproval,
}: ChatMessageProps) => {
  const { fileParts, orderedParts, messageText } = useMemo(
    () => splitMessageParts(message.parts),
    [message.parts]
  );

  const {
    attachments: chatAttachments = [],
    selectedSkill,
    selectionReference,
  } = useMemo(() => getMessageMeta(message), [message]);
  const { fileRefMetaAttachments, otherMetaAttachments } = useMemo(() => {
    const fileRefs: FileRefMetaAttachment[] = [];
    const others: ChatAttachment[] = [];
    for (const attachment of chatAttachments) {
      if (isFileRefMetaAttachment(attachment)) {
        fileRefs.push(attachment);
      } else {
        others.push(attachment);
      }
    }
    return {
      fileRefMetaAttachments: fileRefs,
      otherMetaAttachments: others,
    };
  }, [chatAttachments]);

  const cleanMessageText = useMemo(() => {
    if (message.role === 'user') {
      return cleanFileRefMarker(messageText);
    }
    return messageText;
  }, [message.role, messageText]);

  const handleEditConfirm = useCallback(
    (newContent: string) => {
      actions?.onEditAndResend?.(messageIndex, newContent);
    },
    [actions, messageIndex]
  );

  const {
    isEditing,
    editContent,
    editSize,
    textareaRef,
    contentRef,
    setEditContent,
    startEdit,
    cancelEdit,
    confirmEdit,
    handleKeyDown,
  } = useMessageEdit({ messageText, onConfirm: handleEditConfirm });

  const { t } = useTranslation('chat');

  const isStreaming = status === 'streaming' || status === 'submitted';
  const isUser = message.role === 'user';
  const shouldRenderMetaChipRow =
    isUser &&
    (Boolean(selectedSkill) || Boolean(selectionReference) || fileRefMetaAttachments.length > 0);
  const isAssistant = message.role === 'assistant';
  const streamdownAnimated = isAssistant && isLastMessage === true;
  const streamdownIsAnimating = streamdownAnimated && isStreaming;
  const showAssistantLoadingPlaceholder = shouldShowAssistantLoadingPlaceholder({
    message,
    status,
    isLastMessage: isLastMessage === true,
  });
  const shouldRenderAssistant = shouldRenderAssistantMessage({
    message,
    status,
    isLastMessage: isLastMessage === true,
  });

  const lastTextPartIndex = useMemo(
    () => (streamdownAnimated ? findLastTextPartIndex(orderedParts) : -1),
    [orderedParts, streamdownAnimated]
  );

  const toolModel = useMessageToolModel({ onToolApproval });

  const handleResend = useCallback(() => {
    actions?.onResend?.(messageIndex);
  }, [actions, messageIndex]);

  const handleRetry = useCallback(() => {
    actions?.onRetry?.();
  }, [actions]);

  const handleFork = useCallback(() => {
    actions?.onFork?.(messageIndex);
  }, [actions, messageIndex]);

  const editContentStyle =
    isEditing && editSize
      ? ({ minWidth: editSize.width, minHeight: editSize.height } as CSSProperties)
      : undefined;

  const messageBodyModel = useMemo<MessageBodyModel>(
    () => ({
      view: {
        message,
        orderedParts,
        showThinkingPlaceholder: showAssistantLoadingPlaceholder,
        cleanMessageText,
        isUser,
        streamdownAnimated,
        streamdownIsAnimating,
        lastTextPartIndex,
        thinkingText: t('thinkingText'),
      },
      edit: {
        isEditing,
        editContent,
        textareaRef,
        contentRef,
        editContentStyle,
        onEditContentChange: setEditContent,
        onEditKeyDown: handleKeyDown,
      },
      tool: {
        ...toolModel,
      },
    }),
    [
      message,
      orderedParts,
      cleanMessageText,
      isUser,
      streamdownAnimated,
      streamdownIsAnimating,
      showAssistantLoadingPlaceholder,
      lastTextPartIndex,
      t,
      isEditing,
      editContent,
      textareaRef,
      contentRef,
      editContentStyle,
      setEditContent,
      handleKeyDown,
      toolModel,
    ]
  );

  if (!shouldRenderAssistant) {
    return null;
  }

  return (
    <Message from={message.role} data-message-id={message.id}>
      <MessageBody model={messageBodyModel} />

      {fileParts.length > 0 ? (
        <MessageAttachments>
          {fileParts.map((file) => (
            <MessageAttachment
              key={file.url}
              data={file}
              labels={{
                contextBadge: t('contextInjected'),
                contextExpand: t('viewInjection'),
                contextCollapse: t('collapseInjection'),
                contextTruncated: t('contentTruncated'),
              }}
            />
          ))}
        </MessageAttachments>
      ) : null}

      {shouldRenderMetaChipRow ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 pr-2">
          {selectedSkill ? (
            <FileChip
              icon={Wrench}
              label={selectedSkill.title?.trim() || selectedSkill.name}
              tooltip={selectedSkill.name}
            />
          ) : null}
          {selectionReference ? (
            <FileChip
              icon={Quote}
              label={selectionReference.preview}
              tooltip={selectionReference.filePath}
            />
          ) : null}
          {selectionReference?.isTruncated ? <ChipHintBadge label={t('contentTruncated')} /> : null}
          {fileRefMetaAttachments.map((attachment) => (
            <FileChip
              key={attachment.id}
              icon={File}
              label={attachment.name}
              tooltip={attachment.path}
            />
          ))}
        </div>
      ) : null}

      {isUser && otherMetaAttachments.length > 0 ? (
        <MessageMetaAttachments attachments={otherMetaAttachments} />
      ) : null}

      <MessageActionsLayer
        isEditing={isEditing}
        isUser={isUser}
        isLastAssistant={Boolean(isLastAssistant)}
        isStreaming={isStreaming}
        actions={actions}
        onStartEdit={startEdit}
        onResend={handleResend}
        onRetry={handleRetry}
        onFork={handleFork}
        onCancelEdit={cancelEdit}
        onConfirmEdit={confirmEdit}
      />
    </Message>
  );
};
