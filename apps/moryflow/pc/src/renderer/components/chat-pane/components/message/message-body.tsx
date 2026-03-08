/**
 * [PROPS]: MessageBodyProps - ChatMessage 主体分组模型（view/edit/tool）
 * [EMITS]: onToolApproval
 * [POS]: ChatMessage 主体内容渲染
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { ToolUIPart } from 'ai';
import { MessageContent, MessageResponse } from '@moryflow/ui/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@moryflow/ui/ai/reasoning';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from '@moryflow/ui/ai/streamdown-anim';
import { Loader } from '@moryflow/ui/ai/loader';
import { useTranslation } from '@/lib/i18n';

import { ToolPart } from './tool-part';
import type { MessageBodyModel } from './message-body-model';

type MessageBodyProps = {
  model: MessageBodyModel;
};

export const MessageBody = ({ model }: MessageBodyProps) => {
  const { view, edit, tool } = model;
  const { t } = useTranslation('chat');

  const renderContentByState = () => {
    if (edit.isEditing) {
      return (
        <textarea
          ref={edit.textareaRef}
          value={edit.editContent}
          onChange={(event) => edit.onEditContentChange(event.target.value)}
          onKeyDown={edit.onEditKeyDown}
          className="m-0 block size-full resize-none border-none bg-transparent p-0 text-sm leading-normal outline-hidden"
        />
      );
    }

    if (view.isUser) {
      return (
        <MessageResponse key={`${view.message.id}-text`}>{view.cleanMessageText}</MessageResponse>
      );
    }

    if (view.visibleOrderedPartEntries.length === 0) {
      if (view.showThinkingPlaceholder) {
        return <ThinkingContent text={view.thinkingText} />;
      }
      return null;
    }

    return view.visibleOrderedPartEntries.map(({ orderedPart: part, orderedPartIndex }) => {
      if (isTextUIPart(part)) {
        const shouldAnimate =
          view.streamdownAnimated && orderedPartIndex === view.lastTextOrderedPartIndex;
        return (
          <MessageResponse
            key={`${view.message.id}-text-${orderedPartIndex}`}
            {...(shouldAnimate
              ? {
                  animated: STREAMDOWN_ANIM_STREAMING_OPTIONS,
                  isAnimating: view.streamdownIsAnimating,
                }
              : {})}
          >
            {part.text ?? ''}
          </MessageResponse>
        );
      }

      if (isReasoningUIPart(part)) {
        const reasoningClassName = orderedPartIndex === 0 ? 'mb-1' : 'mt-2 mb-1';
        return (
          <Reasoning
            key={`${view.message.id}-reasoning-${orderedPartIndex}`}
            isStreaming={part.state === 'streaming'}
            defaultOpen={part.state === 'streaming'}
            className={reasoningClassName}
          >
            <ReasoningTrigger
              className="py-0.5 text-sm"
              thinkingLabel={t('thinkingProcess')}
              thoughtLabel={t('thinkingProcess')}
              viewportAnchorId={`reasoning:${view.message.id}:${orderedPartIndex}`}
            />
            <ReasoningContent className="mt-2">{part.text ?? ''}</ReasoningContent>
          </Reasoning>
        );
      }

      if (isToolUIPart(part)) {
        return (
          <ToolPart
            key={`${view.message.id}-tool-${orderedPartIndex}`}
            part={part as ToolUIPart}
            index={orderedPartIndex}
            messageId={view.message.id}
            toolModel={tool}
          />
        );
      }

      return null;
    });
  };

  return (
    <MessageContent ref={view.isUser ? edit.contentRef : undefined} style={edit.editContentStyle}>
      {renderContentByState()}
    </MessageContent>
  );
};

type ThinkingContentProps = {
  text: string;
};

const ThinkingContent = ({ text }: ThinkingContentProps) => {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Loader className="text-muted-foreground" size={14} />
      <span className="sr-only">{text}</span>
    </span>
  );
};
