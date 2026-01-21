/**
 * [PROPS]: ChatMessageProps - 单条聊天消息渲染参数
 * [EMITS]: onEditAndResend/onResend/onRetry/onFork
 * [POS]: Chat Pane 消息内容渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { isFileUIPart, isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { FileUIPart, ToolUIPart, UIMessage } from 'ai';
import {
  Cancel01Icon,
  Edit01Icon,
  GitBranchIcon,
  RefreshIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';

import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageMetaAttachments,
  MessageResponse,
} from '@anyhunt/ui/ai/message';
import { Icon } from '@anyhunt/ui/components/icon';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@anyhunt/ui/ai/reasoning';
import { Shimmer } from '@anyhunt/ui/ai/shimmer';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@anyhunt/ui/ai/tool';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import type { ToolDiffResult, ToolState } from '@anyhunt/ui/ai/tool';

import { getFileParts } from '../../handle';
import { getMessageMeta } from '../../types/message';
import type { ChatMessageProps } from './const';
import { useMessageEdit } from './use-message-edit';

/** 移除消息文本末尾的文件引用标记 */
const FILE_REF_REGEX = /\n\n\[Referenced files: [^\]]+\]$/;

const cleanFileRefMarker = (text: string): string => text.replace(FILE_REF_REGEX, '');

export const ChatMessage = ({
  message,
  messageIndex,
  status,
  registerRef,
  minHeight,
  isPlaceholder,
  isLastAssistant,
  actions,
}: ChatMessageProps) => {
  const handleRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerRef?.(message.id, node);
    },
    [message.id, registerRef]
  );

  // 原有的文件附件（图片等，来自 AI SDK）
  const fileParts = useMemo<FileUIPart[]>(() => getFileParts(message) as FileUIPart[], [message]);

  // 从 metadata 读取结构化附件
  const { attachments: chatAttachments = [] } = useMemo(() => getMessageMeta(message), [message]);

  const orderedParts = useMemo(() => {
    const parts = message.parts ?? [];
    return parts.filter((part) => !isFileUIPart(part));
  }, [message]);

  // 提取消息文本，用户消息需要移除文件引用标记
  const { messageText, cleanMessageText } = useMemo(() => {
    const textParts = orderedParts.filter(isTextUIPart);
    const rawText = textParts.map((p) => p.text).join('\n');

    if (message.role === 'user') {
      return {
        messageText: rawText,
        cleanMessageText: cleanFileRefMarker(rawText),
      };
    }

    return {
      messageText: rawText,
      cleanMessageText: rawText,
    };
  }, [orderedParts, message.role]);

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

  const handleResend = useCallback(() => {
    actions?.onResend?.(messageIndex);
  }, [actions, messageIndex]);

  const handleRetry = useCallback(() => {
    actions?.onRetry?.();
  }, [actions]);

  const handleFork = useCallback(() => {
    actions?.onFork?.(messageIndex);
  }, [actions, messageIndex]);

  const toolStatusLabels = useMemo(
    () => ({
      'input-streaming': t('statusPreparing'),
      'input-available': t('statusExecuting'),
      'approval-requested': t('statusWaitingConfirmation'),
      'approval-responded': t('statusConfirmed'),
      'output-available': t('statusCompleted'),
      'output-error': t('statusError'),
      'output-denied': t('statusSkipped'),
    }),
    [t]
  );

  const toolOutputLabels = useMemo(
    () => ({
      result: t('resultLabel'),
      error: t('errorLabel'),
      targetFile: t('targetFile'),
      contentTooLong: t('contentTooLong'),
      applyToFile: t('applyToFile'),
      applied: t('written'),
      applying: t('applyToFile'),
      noTasks: t('noTasks'),
      tasksCompleted: (completed: number, total: number) =>
        t('tasksCompleted', { completed, total }),
    }),
    [t]
  );

  const handleApplyDiff = useCallback(
    async (result: ToolDiffResult) => {
      if (typeof window === 'undefined' || !window.desktopAPI?.chat?.applyEdit) {
        throw new Error(t('writeFailed'));
      }
      await window.desktopAPI.chat.applyEdit({
        path: result.path!,
        baseSha: result.baseSha!,
        patch: result.patch,
        content: result.content,
        mode: result.mode ?? 'patch',
      });
    },
    [t]
  );

  const canApplyDiff = typeof window !== 'undefined' && Boolean(window.desktopAPI?.chat?.applyEdit);

  const handleApplyDiffSuccess = useCallback(() => {
    toast.success(t('fileWritten'));
  }, [t]);

  const handleApplyDiffError = useCallback(
    (error: unknown) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t('writeFailed'));
    },
    [t]
  );

  const renderTool = (part: ToolUIPart, index: number) => {
    const hasToolInput = part.input !== undefined;
    return (
      <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}>
        <ToolHeader
          type={part.type}
          state={part.state as ToolState}
          input={part.input as Record<string, unknown>}
          statusLabels={toolStatusLabels}
        />
        <ToolContent>
          {hasToolInput ? <ToolInput input={part.input} label={t('parameters')} /> : null}
          <ToolOutput
            output={part.output}
            errorText={part.errorText}
            labels={toolOutputLabels}
            onApplyDiff={canApplyDiff ? handleApplyDiff : undefined}
            onApplyDiffSuccess={canApplyDiff ? handleApplyDiffSuccess : undefined}
            onApplyDiffError={canApplyDiff ? handleApplyDiffError : undefined}
          />
        </ToolContent>
      </Tool>
    );
  };

  // 用户消息内容渲染
  const renderUserContent = () => (
    <MessageResponse key={`${message.id}-text`}>{cleanMessageText}</MessageResponse>
  );

  const renderPart = (part: UIMessage['parts'][number], index: number) => {
    if (isTextUIPart(part)) {
      return (
        <MessageResponse key={`${message.id}-text-${index}`}>{part.text ?? ''}</MessageResponse>
      );
    }
    if (isReasoningUIPart(part)) {
      return (
        <Reasoning
          key={`${message.id}-reasoning-${index}`}
          isStreaming={part.state === 'streaming'}
          defaultOpen={part.state === 'streaming'}
          className="mt-3 rounded-md border border-border/50 bg-muted/20 p-3"
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text ?? ''}</ReasoningContent>
        </Reasoning>
      );
    }
    if (isToolUIPart(part)) {
      return renderTool(part as ToolUIPart, index);
    }
    return null;
  };

  // 渲染原有文件附件（图片等，来自 AI SDK）
  const renderFileParts = () =>
    fileParts.length > 0 ? (
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
    ) : null;

  // 渲染结构化附件（文件引用等，来自 chat metadata）
  const renderChatAttachments = () =>
    chatAttachments.length > 0 ? <MessageMetaAttachments attachments={chatAttachments} /> : null;

  const renderUserActions = () => {
    if (!actions) {
      return null;
    }

    return (
      <MessageActions
        className={`ml-auto transition-opacity ${
          isStreaming ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {actions.onEditAndResend ? (
          <MessageAction onClick={startEdit} size="icon-xs">
            <Icon icon={Edit01Icon} className="size-3" />
          </MessageAction>
        ) : null}
        {actions.onResend ? (
          <MessageAction onClick={handleResend} size="icon-xs">
            <Icon icon={RefreshIcon} className="size-3" />
          </MessageAction>
        ) : null}
        {actions.onFork ? (
          <MessageAction onClick={handleFork} size="icon-xs">
            <Icon icon={GitBranchIcon} className="size-3" />
          </MessageAction>
        ) : null}
      </MessageActions>
    );
  };

  const renderAssistantActions = () => {
    if (!isLastAssistant || !actions?.onRetry) {
      return null;
    }

    return (
      <MessageActions
        className={`min-h-6 transition-opacity ${
          isStreaming ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MessageAction onClick={handleRetry} size="icon-xs">
          <Icon icon={RefreshIcon} className="size-3" />
        </MessageAction>
      </MessageActions>
    );
  };

  const renderEditContent = () => (
    <textarea
      ref={textareaRef}
      value={editContent}
      onChange={(e) => setEditContent(e.target.value)}
      onKeyDown={handleKeyDown}
      className="m-0 block size-full resize-none border-none bg-transparent p-0 text-sm leading-normal outline-hidden"
    />
  );

  const editContentStyle =
    isEditing && editSize ? { minWidth: editSize.width, minHeight: editSize.height } : undefined;

  const renderEditActions = () => (
    <MessageActions className="ml-auto">
      <MessageAction onClick={cancelEdit} size="icon-xs">
        <Icon icon={Cancel01Icon} className="size-3" />
      </MessageAction>
      <MessageAction onClick={confirmEdit} size="icon-xs">
        <Icon icon={Tick02Icon} className="size-3" />
      </MessageAction>
    </MessageActions>
  );

  const renderMessageBody = () => {
    if (isEditing) {
      return renderEditContent();
    }
    if (isUser) {
      return renderUserContent();
    }
    if (orderedParts.length === 0) {
      return <ThinkingContent />;
    }
    return orderedParts.map(renderPart);
  };

  return (
    <Message
      key={message.id}
      ref={handleRef}
      from={message.role}
      data-message-id={message.id}
      style={minHeight ? ({ minHeight } as CSSProperties) : undefined}
      data-placeholder={isPlaceholder ? 'true' : undefined}
    >
      <MessageContent ref={isUser ? contentRef : undefined} style={editContentStyle}>
        {renderMessageBody()}
      </MessageContent>
      {renderFileParts()}
      {isUser ? renderChatAttachments() : null}
      {isEditing ? renderEditActions() : null}
      {!isEditing && isUser ? renderUserActions() : null}
      {!isEditing && !isUser ? renderAssistantActions() : null}
    </Message>
  );
};

const ThinkingContent = () => {
  const { t } = useTranslation('chat');
  return (
    <Shimmer
      className="text-sm font-medium text-muted-foreground"
      as="span"
      duration={3}
      spread={3}
    >
      {t('thinkingText')}
    </Shimmer>
  );
};

export const ThinkingMessage = () => (
  <Message from="assistant">
    <MessageContent>
      <ThinkingContent />
    </MessageContent>
  </Message>
);
