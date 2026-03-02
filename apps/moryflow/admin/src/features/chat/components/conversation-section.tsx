/**
 * 对话区组件
 * 包含消息列表和空态
 */
import { useRef, useEffect } from 'react';
import { Message } from './message';
import { MessageSquare } from 'lucide-react';
import { useChatSessionStore } from '../store';
import { useTranslation } from '@/lib/i18n';

function EmptyConversationState() {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-sm">{t('waitingForYou')}</h3>
        <p className="text-muted-foreground text-sm">{t('startChatPrompt')}</p>
      </div>
    </div>
  );
}

export function ConversationSection() {
  const messages = useChatSessionStore((state) => state.messages);
  const status = useChatSessionStore((state) => state.status);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyConversationState />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            status={status}
            isLastMessage={index === messages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
