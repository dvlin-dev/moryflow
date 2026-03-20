import { randomUUID } from 'node:crypto';
import { user, type AgentInputItem } from '@openai/agents-core';
import type { AutomationJob } from '@moryflow/automations-core';
import {
  createRunModelStreamNormalizer,
  isRunRawModelStreamEvent,
  type Session,
} from '@moryflow/agents-runtime';
import { runWithRuntimeVaultRoot } from '../agent-runtime/runtime/runtime-vault-context.js';
import { mapAutomationExecutionPolicyToRuntimeConfig } from './policy.js';
import type { AutomationRunRecord } from './run-log.js';

type RunnerRuntime = {
  runChatTurn: (options: {
    chatId: string;
    input: string;
    preferredModelId?: string;
    thinking?: AutomationJob['payload']['thinking'];
    mode: 'ask' | 'full_access';
    approvalMode: 'interactive' | 'deny_on_ask';
    session: Session;
    runtimeConfigOverride?: ReturnType<typeof mapAutomationExecutionPolicyToRuntimeConfig>;
  }) => Promise<{
    result: AsyncIterable<unknown> & {
      completed: Promise<void>;
      finalOutput?: unknown;
      output: AgentInputItem[];
    };
  }>;
};

const DEFAULT_CONTEXT_DEPTH = 6;

type HistoryPort = {
  getHistory: (id: string) => AgentInputItem[];
  appendHistory: (id: string, items: AgentInputItem[]) => void;
};

const createInMemorySession = (seedItems: AgentInputItem[]): Session => {
  let items = [...seedItems];
  const sessionId = `automation-session:${randomUUID()}`;
  return {
    async getSessionId() {
      return sessionId;
    },
    async getItems(limit?: number) {
      if (limit === undefined || limit >= items.length) {
        return [...items];
      }
      return items.slice(-limit);
    },
    async addItems(nextItems) {
      items = [...items, ...nextItems];
    },
    async popItem() {
      const popped = items.at(-1);
      if (popped) {
        items = items.slice(0, -1);
      }
      return popped;
    },
    async clearSession() {
      items = [];
    },
  };
};

const isUserMessage = (item: AgentInputItem): boolean => {
  const role = (item as { role?: string }).role;
  return role === 'user';
};

const takeRecentTurns = (items: AgentInputItem[], turnCount: number): AgentInputItem[] => {
  if (turnCount <= 0 || items.length === 0) {
    return [];
  }
  const groups: AgentInputItem[][] = [];
  let current: AgentInputItem[] = [];
  for (const item of items) {
    if (isUserMessage(item) && current.length > 0) {
      groups.push(current);
      current = [item];
      continue;
    }
    current.push(item);
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups.slice(-turnCount).flat();
};

const buildAssistantTextItem = (text: string): AgentInputItem =>
  ({
    type: 'message',
    role: 'assistant',
    content: [{ type: 'output_text', text }],
  }) as unknown as AgentInputItem;

const extractTextFromOutputItems = (items: AgentInputItem[]): string => {
  const chunks: string[] = [];
  for (const item of items) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        'text' in part &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        chunks.push((part as { text: string }).text);
      }
    }
  }
  return chunks.join('').trim();
};

const consumeFinalText = async (
  result: Awaited<ReturnType<RunnerRuntime['runChatTurn']>>['result']
): Promise<string> => {
  const normalizer = createRunModelStreamNormalizer();
  let text = '';
  for await (const event of result) {
    if (!isRunRawModelStreamEvent(event)) {
      continue;
    }
    const extracted = normalizer.consume(event.data);
    if (extracted.deltaText) {
      text += extracted.deltaText;
    }
  }
  await result.completed;
  if (!text.trim() && typeof result.finalOutput === 'string') {
    text = result.finalOutput;
  }
  if (!text.trim()) {
    text = extractTextFromOutputItems(result.output);
  }
  return text.trim();
};

const buildSourcePorts = (chatStore: HistoryPort, contextStore: HistoryPort) => ({
  read(job: AutomationJob): AgentInputItem[] {
    if (job.source.kind === 'conversation-session') {
      return chatStore.getHistory(job.source.sessionId);
    }
    return contextStore.getHistory(job.source.contextId);
  },
  append(job: AutomationJob, items: AgentInputItem[]): void {
    if (job.source.kind === 'conversation-session') {
      chatStore.appendHistory(job.source.sessionId, items);
      return;
    }
    contextStore.appendHistory(job.source.contextId, items);
  },
});

export const createAutomationRunner = (input: {
  runtime?: RunnerRuntime;
  chatSessionStore: HistoryPort;
  contextStore: HistoryPort;
  now?: () => number;
  generateRunId?: () => string;
  withVaultRoot?: <T>(vaultPath: string, task: () => Promise<T>) => Promise<T>;
}) => {
  const runtime = input.runtime;
  if (!runtime) {
    throw new Error('Automation runner requires runtime dependency.');
  }
  const chatStore = input.chatSessionStore;
  const contextStore = input.contextStore;
  const now = input.now ?? (() => Date.now());
  const generateRunId = input.generateRunId ?? (() => randomUUID());
  const withVaultRoot = input.withVaultRoot ?? runWithRuntimeVaultRoot;
  const sourcePorts = buildSourcePorts(chatStore, contextStore);

  return {
    async runAutomationTurn(job: AutomationJob): Promise<{
      outputText: string;
      runRecord: AutomationRunRecord;
      nextState: AutomationJob['state'];
    }> {
      const startedAt = now();
      let warningCode: AutomationRunRecord['warningCode'];
      let warningMessage: string | undefined;
      let seedItems: AgentInputItem[] = [];

      try {
        const sourceHistory = sourcePorts.read(job);
        seedItems = takeRecentTurns(
          sourceHistory,
          job.payload.contextDepth ?? DEFAULT_CONTEXT_DEPTH
        );
      } catch {
        warningCode = 'source_missing';
        warningMessage = 'Automation source history is missing. Ran with payload only.';
        seedItems = [];
      }

      const session = createInMemorySession(seedItems);
      const runtimeOverride = mapAutomationExecutionPolicyToRuntimeConfig(job.executionPolicy);
      const runResult = await withVaultRoot(job.source.vaultPath, () =>
        runtime.runChatTurn({
          chatId: `automation:${job.id}`,
          input: job.payload.contextSummary
            ? `Context:\n${job.payload.contextSummary}\n\n${job.payload.message}`
            : job.payload.message,
          preferredModelId: job.payload.modelId,
          thinking: job.payload.thinking,
          mode: 'ask',
          approvalMode: 'deny_on_ask',
          session,
          runtimeConfigOverride: runtimeOverride,
        })
      );

      const outputText = await consumeFinalText(runResult.result);
      const finishedAt = now();

      const persistedItems: AgentInputItem[] = [user(job.payload.message)];
      if (outputText) {
        persistedItems.push(buildAssistantTextItem(outputText));
      }
      if (!warningCode) {
        sourcePorts.append(job, persistedItems);
      }

      const nextState: AutomationJob['state'] = {
        ...job.state,
        lastRunAt: finishedAt,
        lastRunStatus: 'ok',
        lastError: undefined,
        lastDurationMs: Math.max(0, finishedAt - startedAt),
        consecutiveErrors: 0,
        ...(warningCode
          ? {
              lastWarningCode: warningCode,
              lastWarningMessage: warningMessage,
            }
          : {
              lastWarningCode: undefined,
              lastWarningMessage: undefined,
            }),
      };

      const runRecord: AutomationRunRecord = {
        id: generateRunId(),
        jobId: job.id,
        startedAt,
        finishedAt,
        status: 'ok',
        outputText,
        ...(warningCode ? { warningCode, warningMessage } : {}),
      };

      return {
        outputText,
        runRecord,
        nextState,
      };
    },
  };
};

export type AutomationRunner = ReturnType<typeof createAutomationRunner>;
