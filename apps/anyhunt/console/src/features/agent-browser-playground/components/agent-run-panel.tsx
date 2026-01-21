/**
 * [PROPS]: AgentRunPanelProps
 * [EMITS]: None
 * [POS]: Agent Playground 聊天面板（共享输入框 + 消息列表）
 */

import { type FormEvent, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  InputGroupButton,
  Icon,
} from '@anyhunt/ui';
import type { PromptInputMessage } from '@anyhunt/ui/ai/prompt-input';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@anyhunt/ui/ai/prompt-input';
import { StopIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { ConsoleAgentChatTransport } from '../transport/agent-chat-transport';
import { agentPromptSchema, type AgentPromptValues } from '../schemas';
import type { AgentOutput } from '../types';
import { AgentMessageList } from './AgentMessageList';

interface AgentRunPanelProps {
  apiKeyId: string;
}

export function AgentRunPanel({ apiKeyId }: AgentRunPanelProps) {
  const promptForm = useForm<AgentPromptValues>({
    resolver: zodResolver(agentPromptSchema),
    defaultValues: { message: '' },
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

  const canStop = status === 'submitted' || status === 'streaming';
  const isDisabled = !apiKeyId;

  const handlePromptSubmit = ({ files }: PromptInputMessage, event: FormEvent<HTMLFormElement>) =>
    promptForm.handleSubmit(async (values) => {
      const prompt = values.message.trim();
      try {
        await sendMessage({ text: prompt, files });
        promptForm.reset({ message: '' });
      } catch (error) {
        promptForm.setValue('message', values.message, { shouldDirty: true });
        throw error;
      }
    })(event);

  const handlePromptError = (issue: { code: string; message: string }) => {
    if (issue.code === 'max_files') {
      toast.error('Attachments are not supported yet.');
      return;
    }
    toast.error(issue.message);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1 rounded-lg border border-border-muted bg-background">
        <AgentMessageList messages={messages} status={status} error={error} />
      </div>

      <Form {...promptForm}>
        <PromptInput
          onSubmit={handlePromptSubmit}
          onError={handlePromptError}
          maxFiles={0}
          className="**:data-[slot=input-group]:rounded-xl **:data-[slot=input-group]:shadow-lg **:data-[slot=input-group]:border-border-muted **:data-[slot=input-group]:overflow-hidden"
        >
          <PromptInputBody>
            <FormField
              control={promptForm.control}
              name="message"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <PromptInputTextarea
                      placeholder="Describe the task for the agent"
                      autoComplete="off"
                      disabled={isDisabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="px-3 pt-1" />
                </FormItem>
              )}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <div className="flex items-center gap-2">
              {canStop ? (
                <InputGroupButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Stop generating"
                  disabled={isDisabled}
                  onClick={stop}
                  className="rounded-full bg-white text-black hover:bg-gray-100"
                >
                  <Icon icon={StopIcon} className="size-4" />
                </InputGroupButton>
              ) : (
                <PromptInputSubmit status={status} disabled={isDisabled} className="rounded-full" />
              )}
            </div>
          </PromptInputFooter>
        </PromptInput>
      </Form>
    </div>
  );
}
