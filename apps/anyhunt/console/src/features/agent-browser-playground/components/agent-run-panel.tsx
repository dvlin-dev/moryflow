/**
 * [PROPS]: AgentRunPanelProps
 * [EMITS]: None
 * [POS]: Agent Playground 聊天面板（共享输入框 + 消息列表）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@anyhunt/ui/ai/prompt-input';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@anyhunt/ui/ai/model-selector';
import { ArrowDown01Icon, CheckmarkCircle01Icon, StopIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { ConsoleAgentChatTransport } from '../transport/agent-chat-transport';
import { agentPromptSchema, type AgentPromptValues } from '../schemas';
import { useAgentModels } from '../hooks/use-agent-models';
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

  const modelsQuery = useAgentModels(apiKeyId);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const optionsRef = useRef({
    apiKeyId,
    output: { type: 'text' } as AgentOutput,
    modelId: undefined as string | undefined,
  });

  const initialModelId = useMemo(() => {
    if (!modelsQuery.data) {
      return null;
    }
    const available = modelsQuery.data.models;
    if (available.length === 0) {
      return null;
    }
    const defaultModelId = modelsQuery.data.defaultModelId;
    return (
      available.find((model) => model.modelId === defaultModelId)?.modelId ??
      available[0]?.modelId ??
      null
    );
  }, [modelsQuery.data]);

  const modelOptions = modelsQuery.data?.models ?? [];
  const activeModelId =
    selectedModelId && modelOptions.some((model) => model.modelId === selectedModelId)
      ? selectedModelId
      : initialModelId;

  useEffect(() => {
    optionsRef.current = {
      apiKeyId,
      output: { type: 'text' },
      modelId: activeModelId ?? undefined,
    };
  }, [apiKeyId, activeModelId]);

  const transport = useMemo(() => new ConsoleAgentChatTransport(optionsRef), []);

  const { messages, status, error, sendMessage, stop } = useChat({
    id: 'agent-browser-playground',
    transport,
  });

  const selectedModel = modelOptions.find((model) => model.modelId === activeModelId) ?? null;
  const hasModelOptions = modelOptions.length > 0;

  const canStop = status === 'submitted' || status === 'streaming';
  const isDisabled = !apiKeyId;

  const handlePromptSubmit = ({ files }: PromptInputMessage, event: FormEvent<HTMLFormElement>) =>
    promptForm.handleSubmit(async (values) => {
      const prompt = values.message.trim();
      if (!hasModelOptions || !activeModelId) {
        toast.error('Select a model before sending.');
        return;
      }
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

  const renderModelSelector = () =>
    hasModelOptions ? (
      <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
        <ModelSelectorTrigger asChild>
          <PromptInputButton aria-label="Switch model" disabled={isDisabled}>
            <span>{selectedModel?.displayName ?? selectedModel?.modelId ?? 'Select model'}</span>
            <Icon icon={ArrowDown01Icon} className="size-3 opacity-50" />
          </PromptInputButton>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorList>
            <ModelSelectorEmpty>No model found</ModelSelectorEmpty>
            {modelOptions.map((model) => (
              <ModelSelectorItem
                key={model.modelId}
                value={model.modelId}
                onSelect={() => {
                  setSelectedModelId(model.modelId);
                  setModelSelectorOpen(false);
                }}
              >
                <ModelSelectorName>{model.displayName || model.modelId}</ModelSelectorName>
                {activeModelId === model.modelId ? (
                  <Icon icon={CheckmarkCircle01Icon} className="ml-auto size-4 shrink-0" />
                ) : null}
              </ModelSelectorItem>
            ))}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>
    ) : (
      <PromptInputButton aria-label="Select model" disabled>
        Select model
      </PromptInputButton>
    );

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
            <PromptInputTools>{renderModelSelector()}</PromptInputTools>
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
