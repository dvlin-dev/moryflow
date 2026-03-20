/**
 * [PROPS]: MessageBodyProps - ChatMessage 主体分组模型（view/edit/tool）
 * [EMITS]: onToolApproval
 * [POS]: ChatMessage 主体内容渲染
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Suspense, lazy } from 'react';
import { isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { ToolUIPart } from 'ai';
import { MessageContent } from '@moryflow/ui/ai/message/base';
import { Loader } from '@moryflow/ui/ai/loader';
import { useTranslation } from '@/lib/i18n';

import { ToolPart } from './tool-part';
import type { MessageBodyModel } from './message-body-model';

const LazyMessageRichPart = lazy(() =>
  import('./message-rich-part').then((mod) => ({
    default: mod.MessageRichPart,
  }))
);

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
        <Suspense fallback={<PlainTextContent text={view.cleanMessageText} />}>
          <LazyMessageRichPart
            key={`${view.message.id}-text`}
            messageId={view.message.id}
            orderedPartIndex={0}
            part={{ type: 'text', text: view.cleanMessageText }}
            shouldAnimate={false}
            isAnimating={false}
            thinkingLabel={t('thinkingProcess')}
          />
        </Suspense>
      );
    }

    if (view.visibleOrderedPartEntries.length === 0) {
      if (view.showThinkingPlaceholder || view.showStreamingTail) {
        return <ThinkingContent text={view.thinkingText} />;
      }
      return null;
    }

    return (
      <>
        {view.visibleOrderedPartEntries.map(({ orderedPart: part, orderedPartIndex }) => {
          if (isTextUIPart(part)) {
            const shouldAnimate =
              view.streamdownAnimated && orderedPartIndex === view.lastTextOrderedPartIndex;
            return (
              <Suspense
                key={`${view.message.id}-text-${orderedPartIndex}`}
                fallback={<PlainTextContent text={part.text ?? ''} />}
              >
                <LazyMessageRichPart
                  messageId={view.message.id}
                  orderedPartIndex={orderedPartIndex}
                  part={part}
                  shouldAnimate={shouldAnimate}
                  isAnimating={view.streamdownIsAnimating}
                  thinkingLabel={t('thinkingProcess')}
                />
              </Suspense>
            );
          }

          if (isReasoningUIPart(part)) {
            return (
              <Suspense
                key={`${view.message.id}-reasoning-${orderedPartIndex}`}
                fallback={
                  <PlainReasoningContent
                    text={part.text ?? ''}
                    orderedPartIndex={orderedPartIndex}
                    thinkingLabel={t('thinkingProcess')}
                  />
                }
              >
                <LazyMessageRichPart
                  messageId={view.message.id}
                  orderedPartIndex={orderedPartIndex}
                  part={part}
                  shouldAnimate={false}
                  isAnimating={false}
                  thinkingLabel={t('thinkingProcess')}
                />
              </Suspense>
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
        })}
        {view.showStreamingTail ? <ThinkingContent text={view.thinkingText} /> : null}
      </>
    );
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

const PlainTextContent = ({ text }: { text: string }) => (
  <div className="whitespace-pre-wrap break-words text-sm leading-normal">{text}</div>
);

const PlainReasoningContent = ({
  text,
  orderedPartIndex,
  thinkingLabel,
}: {
  text: string;
  orderedPartIndex: number;
  thinkingLabel: string;
}) => (
  <div className={orderedPartIndex === 0 ? 'mb-1' : 'mt-2 mb-1'}>
    <div className="py-0.5 text-sm text-muted-foreground">{thinkingLabel}</div>
    <div className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{text}</div>
  </div>
);
