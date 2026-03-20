import { isReasoningUIPart, isTextUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { MessageResponse } from '@moryflow/ui/ai/message/response';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@moryflow/ui/ai/reasoning';
import { STREAMDOWN_ANIM_STREAMING_OPTIONS } from '@moryflow/ui/ai/streamdown-anim';

type MessageRichPartProps = {
  messageId: string;
  orderedPartIndex: number;
  part: UIMessage['parts'][number];
  shouldAnimate: boolean;
  isAnimating: boolean;
  thinkingLabel: string;
};

export const MessageRichPart = ({
  messageId,
  orderedPartIndex,
  part,
  shouldAnimate,
  isAnimating,
  thinkingLabel,
}: MessageRichPartProps) => {
  if (isTextUIPart(part)) {
    return (
      <MessageResponse
        {...(shouldAnimate
          ? {
              animated: STREAMDOWN_ANIM_STREAMING_OPTIONS,
              isAnimating,
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
        isStreaming={part.state === 'streaming'}
        defaultOpen={part.state === 'streaming'}
        className={reasoningClassName}
      >
        <ReasoningTrigger
          className="py-0.5 text-sm"
          thinkingLabel={thinkingLabel}
          thoughtLabel={thinkingLabel}
          viewportAnchorId={`reasoning:${messageId}:${orderedPartIndex}`}
        />
        <ReasoningContent className="mt-2">{part.text ?? ''}</ReasoningContent>
      </Reasoning>
    );
  }

  return null;
};
