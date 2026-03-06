/**
 * 聊天主面板组件
 * 整合头部、对话区、底部输入
 * 使用 Bearer Token 认证调用 /v1/chat/completions 端点 (OpenAI 兼容)
 */
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleAlert } from 'lucide-react';
import { ChatHeader } from './chat-header';
import { ConversationSection } from './conversation-section';
import { ChatFooter } from './chat-footer';
import { chatMethods, useSyncChatModels } from '../methods';
import { selectChatDisplayError, useChatSessionStore } from '../store';

export function ChatPane() {
  useSyncChatModels();
  const displayError = useChatSessionStore(selectChatDisplayError);

  useEffect(() => {
    chatMethods.resetChatConversation();

    return () => {
      chatMethods.stopChatStream();
    };
  }, []);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <ChatHeader />

      {displayError && (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertDescription>{displayError.message}</AlertDescription>
          </Alert>
        </div>
      )}

      <ConversationSection />
      <ChatFooter />
    </Card>
  );
}
