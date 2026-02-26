/**
 * 聊天主面板组件
 * 整合头部、对话区、底部输入
 * 使用 Bearer Token 认证调用 /v1/chat/completions 端点 (OpenAI 兼容)
 */
import { useCallback, useState, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ChatHeader } from './chat-header';
import { ConversationSection } from './conversation-section';
import { ChatFooter } from './chat-footer';
import { useChatModels } from '../hooks/use-chat-models';
import { createChatCompletionStream } from '../api';
import type { ModelOption } from '../types';
import { useAuthStore } from '@/stores/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircleAlert } from 'lucide-react';
import { parseChatStreamChunk } from '../stream-parser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export function ChatPane() {
  const {
    modelGroups,
    selectedModelId,
    setSelectedModelId,
    isLoading: modelsLoading,
    error: modelsError,
  } = useChatModels();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 消息状态
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [error, setError] = useState<Error | null>(null);
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0 });

  // 用于取消流式请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取选中模型的 maxContextTokens
  const selectedModelMaxTokens = useMemo(() => {
    if (!selectedModelId) return 0;
    for (const group of modelGroups) {
      const model = group.options.find((m: ModelOption) => m.id === selectedModelId);
      if (model) {
        return model.maxContextTokens;
      }
    }
    return 0;
  }, [modelGroups, selectedModelId]);

  // 计算已使用的总 token
  const usedTokens = tokenUsage.prompt + tokenUsage.completion;

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!selectedModelId || !isAuthenticated) return;

      // 添加用户消息
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
      };
      const requestMessages = [...messagesRef.current, userMessage];
      messagesRef.current = requestMessages;
      setMessages(requestMessages);
      setStatus('submitted');
      setError(null);

      // 创建 AbortController
      abortControllerRef.current = new AbortController();

      try {
        const response = await createChatCompletionStream(
          {
            model: selectedModelId,
            messages: requestMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          },
          abortControllerRef.current.signal
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Request failed');
        }

        setStatus('streaming');

        // 创建助手消息占位
        const assistantMessageId = crypto.randomUUID();
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
        };
        updateMessages((prev) => [...prev, assistantMessage]);

        // 读取流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              const parsedChunk = parseChatStreamChunk(chunk);

              for (const content of parsedChunk.contentSegments) {
                updateMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId ? { ...m, content: m.content + content } : m
                  )
                );
              }

              if (parsedChunk.usage) {
                setTokenUsage(parsedChunk.usage);
              }

              if (parsedChunk.done) {
                done = true;
                break;
              }
            }
          }
        }

        setStatus('ready');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 用户取消
          setStatus('ready');
        } else {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setStatus('error');
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [selectedModelId, isAuthenticated, updateMessages]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus('ready');
  }, []);

  const displayError = modelsError || error;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <ChatHeader />

      {displayError && (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertDescription>
              {displayError instanceof Error ? displayError.message : '发生错误'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <ConversationSection messages={messages} status={status} />

      <ChatFooter
        status={status}
        onSubmit={handleSubmit}
        onStop={handleStop}
        modelGroups={modelGroups}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        disabled={modelsLoading || !selectedModelId}
        usedTokens={usedTokens}
        maxTokens={selectedModelMaxTokens}
      />
    </Card>
  );
}
