/**
 * 对话区组件
 * 包含消息列表和空态
 */
import { useRef, useEffect } from 'react';
import { Message } from './message';
import { Icon } from '@/components/ui/icon';
import { Message01Icon } from '@hugeicons/core-free-icons';

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationSectionProps {
  messages: MessageItem[];
  status: ChatStatus;
}

export function ConversationSection({ messages, status }: ConversationSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <Icon icon={Message01Icon} className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-sm">开始聊天测试</h3>
          <p className="text-muted-foreground text-sm">从用户视角测试 AI 聊天接口</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {status === 'streaming' && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-foreground/50" />
                <span className="size-1.5 animate-pulse rounded-full bg-foreground/50 delay-150" />
                <span className="size-1.5 animate-pulse rounded-full bg-foreground/50 delay-300" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
