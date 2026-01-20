/**
 * [PROPS]: AgentRunPanelProps
 * [EMITS]: None
 * [POS]: Agent Playground 聊天面板（消息列表 + 输入）
 */

import { useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@anyhunt/ui';
import { PromptInputSubmit } from '@anyhunt/ui/ai/prompt-input';
import { ConsoleAgentChatTransport } from '../transport/agent-chat-transport';
import { agentPromptSchema, type AgentPromptValues } from '../schemas';
import type { AgentOutput } from '../types';
import { AgentMessageList } from './agent-message-list';

interface AgentRunPanelProps {
  apiKeyId: string;
}

export function AgentRunPanel({ apiKeyId }: AgentRunPanelProps) {
  const promptForm = useForm<AgentPromptValues>({
    resolver: zodResolver(agentPromptSchema),
    defaultValues: { prompt: '' },
  });

  const optionsRef = useRef({
    apiKeyId,
    output: { type: 'text' } as AgentOutput,
  });

  useEffect(() => {
    optionsRef.current = {
      apiKeyId,
      output: { type: 'text' },
    };
  }, [apiKeyId]);

  const transport = useMemo(() => new ConsoleAgentChatTransport(optionsRef), []);

  const { messages, status, error, sendMessage, stop } = useChat({
    id: 'agent-browser-playground',
    transport,
  });

  const handlePromptSubmit = async (values: AgentPromptValues) => {
    const prompt = values.prompt.trim();
    if (!prompt) return;

    if (status === 'streaming' || status === 'submitted') {
      stop();
      return;
    }

    await sendMessage({ text: prompt });
    promptForm.reset({ prompt: '' });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void promptForm.handleSubmit(handlePromptSubmit)();
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1 rounded-lg border border-border-muted bg-background">
        <AgentMessageList messages={messages} status={status} error={error} />
      </div>

      <Form {...promptForm}>
        <form onSubmit={promptForm.handleSubmit(handlePromptSubmit)} className="space-y-2">
          <FormField
            control={promptForm.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Prompt</FormLabel>
                <FormControl>
                  <InputGroup>
                    <InputGroupTextarea
                      placeholder="Describe the task for the agent"
                      rows={3}
                      {...field}
                      onKeyDown={handleKeyDown}
                    />
                    <InputGroupAddon align="inline-end">
                      <PromptInputSubmit
                        status={status}
                        disabled={!apiKeyId || status === 'submitted'}
                        className="rounded-full"
                      />
                    </InputGroupAddon>
                  </InputGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
