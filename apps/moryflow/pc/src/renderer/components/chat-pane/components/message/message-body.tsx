/**
 * [PROPS]: MessageBodyProps - ChatMessage 主体分组模型（view/edit/tool）
 * [EMITS]: onToolApproval
 * [POS]: ChatMessage 主体内容渲染
 * [UPDATE]: 2026-03-01 - 仅在 showThinkingPlaceholder=true 时渲染 loading，占位与 file-only 消息解耦
 * [UPDATE]: 2026-02-26 - 改为 MessageBodyModel 分组输入，收敛 props 膨胀
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { ToolUIPart } from 'ai';
import { MessageContent, MessageResponse } from '@moryflow/ui/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@moryflow/ui/ai/reasoning';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from '@moryflow/ui/ai/streamdown-anim';
import { Loader } from '@moryflow/ui/ai/loader';

import { ToolPart } from './tool-part';
import type { MessageBodyModel } from './message-body-model';

type MessageBodyProps = {
  model: MessageBodyModel;
};

export const MessageBody = ({ model }: MessageBodyProps) => {
  const { view, edit, tool } = model;

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

    if (view.orderedParts.length === 0) {
      if (view.showThinkingPlaceholder) {
        return <ThinkingContent text={view.thinkingText} />;
      }
      return null;
    }

    return view.orderedParts.map((part, index) => {
      if (isTextUIPart(part)) {
        const shouldAnimate = view.streamdownAnimated && index === view.lastTextPartIndex;
        return (
          <MessageResponse
            key={`${view.message.id}-text-${index}`}
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
        return (
          <Reasoning
            key={`${view.message.id}-reasoning-${index}`}
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
        return (
          <ToolPart
            key={`${view.message.id}-tool-${index}`}
            part={part as ToolUIPart}
            index={index}
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
