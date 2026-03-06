/**
 * [PROPS]: FlowRunnerProps
 * [EMITS]: onSessionChange
 * [POS]: Agent + Browser 闭环测试入口（含完成状态判定）
 */

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import { CodeBlock } from '@moryflow/ui/ai/code-block';
import { parseSchemaJsonToAgentOutput } from '../agent-output';
import { flowRunnerSchema, type FlowRunnerValues } from '../schemas';
import {
  createBrowserSession,
  closeBrowserSession,
  openBrowserUrl,
  getBrowserSnapshot,
  getBrowserScreenshot,
} from '../browser-api';
import { estimateAgentCost, executeAgentTask, getAgentTaskStatus } from '../agent-api';
import type { BrowserSessionInfo } from '../types';
import { createPendingSteps, parseUrls } from './flow-runner-helpers';
import { FlowRunnerForm } from './flow-runner-form';
import { FlowRunnerStepList } from './flow-runner-step-list';
import type { FlowRunnerResult, FlowStep, FlowStepStatus } from './flow-runner-types';

export interface FlowRunnerProps {
  apiKey: string;
  onSessionChange?: (sessionId: string) => void;
}

export function FlowRunner({ apiKey, onSessionChange }: FlowRunnerProps) {
  const form = useForm<FlowRunnerValues>({
    resolver: zodResolver(flowRunnerSchema),
    defaultValues: {
      targetUrl: 'https://example.com',
      prompt: 'Summarize the key information from the page.',
      schemaJson: '',
      maxCredits: 200,
    },
  });

  const [steps, setSteps] = useState<FlowStep[]>(createPendingSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FlowRunnerResult | null>(null);

  const updateStep = (id: string, status: FlowStepStatus, detail?: string) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status, detail } : step)));
  };

  const resetSteps = () => {
    setSteps(createPendingSteps());
  };

  const resultJson = useMemo(() => {
    if (!result) return null;
    return JSON.stringify(result, null, 2);
  }, [result]);

  const runFlow = async (values: FlowRunnerValues) => {
    if (!apiKey) {
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
      session = await createBrowserSession(apiKey, {});
      updateStep('create', 'success', session.id);
      onSessionChange?.(session.id);

      activeStepId = 'open';
      updateStep('open', 'running');
      const open = await openBrowserUrl(apiKey, session.id, {
        url: values.targetUrl,
        waitUntil: 'domcontentloaded',
      });
      updateStep('open', 'success');

      activeStepId = 'snapshot';
      updateStep('snapshot', 'running');
      const snapshot = await getBrowserSnapshot(apiKey, session.id, {
        interactive: true,
      });
      updateStep('snapshot', 'success');

      activeStepId = 'screenshot';
      updateStep('screenshot', 'running');
      const screenshot = await getBrowserScreenshot(apiKey, session.id, {
        fullPage: true,
        format: 'png',
      });
      updateStep('screenshot', 'success');

      activeStepId = 'estimate';
      updateStep('estimate', 'running');
      const estimate = await estimateAgentCost(apiKey, {
        prompt: values.prompt,
        urls: parseUrls(values.targetUrl),
        output: parseSchemaJsonToAgentOutput(values.schemaJson),
        maxCredits: values.maxCredits,
      });
      updateStep('estimate', 'success');

      activeStepId = 'agent';
      updateStep('agent', 'running');
      const agent = await executeAgentTask(apiKey, {
        prompt: values.prompt,
        urls: parseUrls(values.targetUrl),
        output: parseSchemaJsonToAgentOutput(values.schemaJson),
        maxCredits: values.maxCredits,
      });
      updateStep('agent', 'success', agent.id);

      activeStepId = 'status';
      updateStep('status', 'running');
      if (!agent?.id) {
        throw new Error('Agent task id is missing');
      }
      const status = await getAgentTaskStatus(apiKey, agent.id);
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
    } finally {
      if (session) {
        try {
          updateStep('close', 'running');
          await closeBrowserSession(apiKey, session.id);
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
        <FlowRunnerForm apiKey={apiKey} form={form} running={running} onSubmit={runFlow} />

        <FlowRunnerStepList steps={steps} />

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
