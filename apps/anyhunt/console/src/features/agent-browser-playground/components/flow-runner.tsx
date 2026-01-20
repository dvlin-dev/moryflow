/**
 * [PROPS]: FlowRunnerProps
 * [EMITS]: onSessionChange
 * [POS]: Agent + Browser 闭环测试入口（含完成状态判定）
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Badge,
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
} from '@anyhunt/ui';
import { CodeBlock } from '@anyhunt/ui/ai/code-block';
import { flowRunnerSchema, type FlowRunnerValues } from '../schemas';
import {
  createBrowserSession,
  openBrowserUrl,
  getBrowserSnapshot,
  getBrowserScreenshot,
  closeBrowserSession,
  estimateAgentCost,
  executeAgentTask,
  getAgentTaskStatus,
} from '../api';
import type {
  AgentEstimateResponse,
  AgentTaskResult,
  BrowserOpenResponse,
  BrowserScreenshotResponse,
  BrowserSessionInfo,
  BrowserSnapshotResponse,
} from '../types';

type FlowStepStatus = 'pending' | 'running' | 'success' | 'failed';

type FlowStep = {
  id: string;
  label: string;
  status: FlowStepStatus;
  detail?: string;
};

type FlowRunnerResult = {
  session?: BrowserSessionInfo;
  open?: BrowserOpenResponse;
  snapshot?: BrowserSnapshotResponse;
  screenshot?: BrowserScreenshotResponse;
  estimate?: AgentEstimateResponse;
  agent?: AgentTaskResult;
  status?: AgentTaskResult | null;
};

const parseUrls = (value?: string) =>
  value
    ?.split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const parseSchema = (value?: string) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const stepDefinitions: FlowStep[] = [
  { id: 'create', label: 'Create session', status: 'pending' },
  { id: 'open', label: 'Open URL', status: 'pending' },
  { id: 'snapshot', label: 'Snapshot', status: 'pending' },
  { id: 'screenshot', label: 'Screenshot', status: 'pending' },
  { id: 'estimate', label: 'Estimate credits', status: 'pending' },
  { id: 'agent', label: 'Run agent', status: 'pending' },
  { id: 'status', label: 'Check status', status: 'pending' },
  { id: 'close', label: 'Close session', status: 'pending' },
];

const statusLabel: Record<FlowStepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
};

export interface FlowRunnerProps {
  apiKeyId: string;
  onSessionChange?: (sessionId: string) => void;
}

export function FlowRunner({ apiKeyId, onSessionChange }: FlowRunnerProps) {
  const form = useForm<FlowRunnerValues>({
    resolver: zodResolver(flowRunnerSchema),
    defaultValues: {
      targetUrl: 'https://example.com',
      prompt: 'Summarize the key information from the page.',
      schemaJson: '',
      maxCredits: 200,
    },
  });

  const [steps, setSteps] = useState<FlowStep[]>(stepDefinitions);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FlowRunnerResult | null>(null);

  const updateStep = (id: string, status: FlowStepStatus, detail?: string) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status, detail } : step)));
  };

  const resetSteps = () => {
    setSteps(stepDefinitions.map((step) => ({ ...step, status: 'pending', detail: undefined })));
  };

  const resultJson = useMemo(() => {
    if (!result) return null;
    return JSON.stringify(result, null, 2);
  }, [result]);

  const runFlow = async (values: FlowRunnerValues) => {
    if (!apiKeyId) {
      toast.error('Select an API key first');
      return;
    }

    resetSteps();
    setRunning(true);
    setResult(null);

    let session: BrowserSessionInfo | null = null;
    let activeStepId: string | null = null;
    try {
      activeStepId = 'create';
      updateStep('create', 'running');
      session = await createBrowserSession(apiKeyId, {});
      updateStep('create', 'success', session.id);
      onSessionChange?.(session.id);

      activeStepId = 'open';
      updateStep('open', 'running');
      const open = await openBrowserUrl(apiKeyId, session.id, {
        url: values.targetUrl,
        waitUntil: 'domcontentloaded',
      });
      updateStep('open', 'success');

      activeStepId = 'snapshot';
      updateStep('snapshot', 'running');
      const snapshot = await getBrowserSnapshot(apiKeyId, session.id, {
        interactive: true,
      });
      updateStep('snapshot', 'success');

      activeStepId = 'screenshot';
      updateStep('screenshot', 'running');
      const screenshot = await getBrowserScreenshot(apiKeyId, session.id, {
        fullPage: true,
        format: 'png',
      });
      updateStep('screenshot', 'success');

      activeStepId = 'estimate';
      updateStep('estimate', 'running');
      const estimate = await estimateAgentCost(apiKeyId, {
        prompt: values.prompt,
        urls: parseUrls(values.targetUrl),
        schema: parseSchema(values.schemaJson),
        maxCredits: values.maxCredits,
      });
      updateStep('estimate', 'success');

      activeStepId = 'agent';
      updateStep('agent', 'running');
      const agent = await executeAgentTask(apiKeyId, {
        prompt: values.prompt,
        urls: parseUrls(values.targetUrl),
        schema: parseSchema(values.schemaJson),
        maxCredits: values.maxCredits,
      });
      updateStep('agent', 'success', agent.id);

      activeStepId = 'status';
      updateStep('status', 'running');
      if (!agent?.id) {
        throw new Error('Agent task id is missing');
      }
      const status = await getAgentTaskStatus(apiKeyId, agent.id);
      const isCompleted = status?.status === 'completed';
      updateStep('status', isCompleted ? 'success' : 'failed', status?.status ?? 'unknown');

      activeStepId = 'close';
      setResult({ session, open, snapshot, screenshot, estimate, agent, status });
      if (isCompleted) {
        toast.success('Flow completed');
      } else {
        toast.error('Flow did not complete');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
      if (activeStepId) {
        updateStep(activeStepId, 'failed', message);
      }
      setResult((prev) => prev ?? null);
    } finally {
      if (session) {
        try {
          updateStep('close', 'running');
          await closeBrowserSession(apiKeyId, session.id);
          updateStep('close', 'success');
          onSessionChange?.('');
        } catch {
          updateStep('close', 'failed');
        }
      }
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>E2E Flow Runner</CardTitle>
        <CardDescription>Run a full Browser → Agent → Cleanup flow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(runFlow)} className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="targetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Agent Prompt</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the target task" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="schemaJson"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Output Schema (JSON)</FormLabel>
                  <FormControl>
                    <Input placeholder='{"title":"string"}' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={running || !apiKeyId}>
                {running ? 'Running...' : 'Run Flow'}
              </Button>
            </div>
          </form>
        </Form>

        <div className="grid gap-2 md:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between rounded-lg border border-border-muted px-3 py-2 text-sm"
            >
              <span>{step.label}</span>
              <Badge
                variant={step.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {statusLabel[step.status]}
              </Badge>
            </div>
          ))}
        </div>

        {resultJson && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Latest Run Output</div>
            <CodeBlock code={resultJson} language="json" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
