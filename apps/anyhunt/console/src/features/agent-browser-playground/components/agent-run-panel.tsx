/**
 * [PROPS]: AgentRunPanelProps
 * [EMITS]: None
 * [POS]: Agent Playground 运行面板（useChat + Transport）
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@anyhunt/ui';
import { PromptInputSubmit } from '@anyhunt/ui/ai/prompt-input';
import { ConsoleAgentChatTransport } from '../transport/agent-chat-transport';
import { parseSchemaJsonToAgentOutput } from '../agent-output';
import {
  agentOptionsSchema,
  agentPromptSchema,
  type AgentOptionsValues,
  type AgentPromptValues,
} from '../schemas';
import { estimateAgentCost } from '../api';
import type { AgentEstimateResponse, AgentOutput } from '../types';
import { AgentMessageList } from './agent-message-list';

interface AgentRunPanelProps {
  apiKeyId: string;
}

const parseUrls = (value?: string) =>
  value
    ?.split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

export function AgentRunPanel({ apiKeyId }: AgentRunPanelProps) {
  const optionsForm = useForm<AgentOptionsValues>({
    resolver: zodResolver(agentOptionsSchema),
    defaultValues: {
      urls: '',
      schemaJson: '',
      maxCredits: 200,
    },
  });
  const optionsWatch = useWatch({ control: optionsForm.control });

  const promptForm = useForm<AgentPromptValues>({
    resolver: zodResolver(agentPromptSchema),
    defaultValues: { prompt: '' },
  });

  const [estimate, setEstimate] = useState<AgentEstimateResponse | null>(null);
  const optionsRef = useRef({
    apiKeyId,
    urls: [] as string[],
    output: { type: 'text' } as AgentOutput,
    schemaJson: '' as string,
    maxCredits: undefined as number | undefined,
  });

  useEffect(() => {
    const schemaJson = optionsWatch?.schemaJson ?? '';
    let output: AgentOutput = { type: 'text' };
    try {
      output = parseSchemaJsonToAgentOutput(schemaJson);
    } catch {
      output = { type: 'text' };
    }

    optionsRef.current = {
      apiKeyId,
      urls: parseUrls(optionsWatch?.urls),
      output,
      schemaJson,
      maxCredits: optionsWatch?.maxCredits || undefined,
    };
  }, [apiKeyId, optionsWatch?.urls, optionsWatch?.schemaJson, optionsWatch?.maxCredits]);

  const transport = useMemo(() => new ConsoleAgentChatTransport(optionsRef), []);

  const { messages, status, error, sendMessage, stop, setMessages } = useChat({
    id: 'agent-browser-playground',
    transport,
  });

  const estimateMutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => estimateAgentCost(apiKeyId, input),
    onSuccess: (data) => {
      setEstimate(data);
      toast.success('Estimate completed');
    },
    onError: (err: Error) => {
      toast.error(`Estimate failed: ${err.message}`);
    },
  });

  const handlePromptSubmit = async (values: AgentPromptValues) => {
    if (!apiKeyId) {
      toast.error('Select an API key first');
      return;
    }

    const prompt = values.prompt.trim();
    if (!prompt) return;

    if (status === 'streaming' || status === 'submitted') {
      stop();
      return;
    }

    await sendMessage({ text: prompt });
    promptForm.reset({ prompt: '' });
  };

  const handleEstimate = async () => {
    if (!apiKeyId) {
      toast.error('Select an API key first');
      return;
    }

    const prompt = promptForm.getValues('prompt').trim();
    if (!prompt) {
      toast.error('Please enter a prompt to estimate');
      return;
    }
    const input = {
      prompt,
      urls: optionsRef.current.urls.length ? optionsRef.current.urls : undefined,
      output: optionsRef.current.output,
      maxCredits: optionsRef.current.maxCredits,
    };
    await estimateMutation.mutateAsync(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void promptForm.handleSubmit(handlePromptSubmit)();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Agent Run</CardTitle>
        <CardDescription>Run Agent tasks with streaming output and tool traces.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...optionsForm}>
          <form className="grid gap-4">
            <FormField
              control={optionsForm.control}
              name="urls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seed URLs</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com, https://docs.anyhunt.app" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={optionsForm.control}
              name="schemaJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Schema (JSON)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='{"title":{"type":"string"},"price":{"type":"number"}}'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={optionsForm.control}
              name="maxCredits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Credits</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleEstimate}
            disabled={!apiKeyId || estimateMutation.isPending}
          >
            Estimate
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMessages([])}>
            Clear Messages
          </Button>
          {estimate && (
            <div className="text-xs text-muted-foreground">
              Estimated credits: {estimate.estimatedCredits}
            </div>
          )}
        </div>

        <div className="h-[360px] rounded-lg border border-border-muted bg-background">
          <AgentMessageList messages={messages} status={status} error={error} />
        </div>

        <Form {...promptForm}>
          <form onSubmit={promptForm.handleSubmit(handlePromptSubmit)} className="space-y-2">
            <FormField
              control={promptForm.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
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
      </CardContent>
    </Card>
  );
}
