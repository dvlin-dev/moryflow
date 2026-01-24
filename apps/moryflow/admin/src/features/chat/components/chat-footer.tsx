/**
 * 聊天底部输入区组件
 */
import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModelSelector } from './model-selector';
import { TokenUsageIndicator } from './token-usage-indicator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Icon } from '@/components/ui/icon';
import { ArrowUp01Icon, ClipIcon, StopIcon } from '@hugeicons/core-free-icons';
import type { ModelGroup } from '../types';

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

interface ChatFooterProps {
  status: ChatStatus;
  onSubmit: (text: string) => void;
  onStop: () => void;
  modelGroups: ModelGroup[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  disabled?: boolean;
  usedTokens?: number;
  maxTokens?: number;
}

export function ChatFooter({
  status,
  onSubmit,
  onStop,
  modelGroups,
  selectedModelId,
  onSelectModel,
  disabled,
  usedTokens,
  maxTokens,
}: ChatFooterProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === 'streaming' || status === 'submitted';
  const canSubmit = input.trim().length > 0 && !isStreaming && !disabled;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <TooltipProvider>
      <div className="shrink-0 border-t bg-background p-3">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            {/* 输入框 */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={disabled}
                className="min-h-[80px] resize-none pr-12 rounded-xl"
                rows={3}
              />
            </div>

            {/* 底部工具栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* 附件按钮（占位） */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      disabled
                    >
                      <Icon icon={ClipIcon} className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>附件（暂未实现）</TooltipContent>
                </Tooltip>

                {/* 模型选择器 */}
                <ModelSelector
                  modelGroups={modelGroups}
                  selectedModelId={selectedModelId}
                  onSelectModel={onSelectModel}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Token 使用量 */}
                <TokenUsageIndicator usedTokens={usedTokens} maxTokens={maxTokens} />

                {/* 发送/停止按钮 */}
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={onStop}
                    className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Icon icon={StopIcon} className="size-3 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!canSubmit}
                    className="size-8 rounded-full"
                  >
                    <Icon icon={ArrowUp01Icon} className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
