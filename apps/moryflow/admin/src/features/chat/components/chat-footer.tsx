/**
 * 聊天底部输入区组件
 */
import {
  useState,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from './model-selector';
import { TokenUsageIndicator } from './token-usage-indicator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ArrowUp, Paperclip, SquareStop } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { chatMethods } from '../methods';
import {
  selectIsStreaming,
  selectSelectedModelMaxTokens,
  selectUsedTokens,
  useChatSessionStore,
} from '../store';

function renderActionButtonByState(params: {
  isStreaming: boolean;
  canSubmit: boolean;
  onStop: () => void;
}): ReactNode {
  const { isStreaming, canSubmit, onStop } = params;

  switch (isStreaming) {
    case true:
      return (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onStop}
          className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          <SquareStop className="size-3 fill-current" />
        </Button>
      );
    case false:
    default:
      return (
        <Button type="submit" size="icon" disabled={!canSubmit} className="size-8 rounded-full">
          <ArrowUp className="size-4" />
        </Button>
      );
  }
}

export function ChatFooter() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = useChatSessionStore(selectIsStreaming);
  const selectedModelId = useChatSessionStore((state) => state.selectedModelId);
  const modelsLoading = useChatSessionStore((state) => state.modelsLoading);
  const usedTokens = useChatSessionStore(selectUsedTokens);
  const maxTokens = useChatSessionStore(selectSelectedModelMaxTokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isDisabled = modelsLoading || !selectedModelId || !isAuthenticated;
  const canSubmit = input.trim().length > 0 && !isStreaming && !isDisabled;

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit) return;

    const trimmedInput = input.trim();
    setInput('');
    void chatMethods.submitChatMessage(trimmedInput);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <TooltipProvider>
      <div className="shrink-0 border-t bg-background p-3">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={isDisabled}
                className="min-h-[80px] resize-none pr-12 rounded-xl"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      disabled
                    >
                      <Paperclip className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>附件（暂未实现）</TooltipContent>
                </Tooltip>

                <ModelSelector />
              </div>

              <div className="flex items-center gap-2">
                <TokenUsageIndicator usedTokens={usedTokens} maxTokens={maxTokens} />

                {renderActionButtonByState({
                  isStreaming,
                  canSubmit,
                  onStop: chatMethods.stopChatStream,
                })}
              </div>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
