import type { AgentInputItem, Agent, RunState } from '@openai/agents-core';
import type { RunStreamEvent } from '@openai/agents-core';
import type {
  AgentContext,
  AgentAccessMode,
  AgentApprovalMode,
  AgentAttachmentContext,
  AgentImageContent,
  AgentRuntimeConfig,
  CompactionResult,
  Session,
  ThinkingDowngradeReason,
  ToolRuntimeStreamEvent,
} from '@moryflow/agents-runtime';

import type {
  AgentChatContext,
  AgentThinkingProfile,
  AgentThinkingSelection,
  McpStatusSnapshot,
  McpStatusEvent,
  McpTestInput,
  McpTestResult,
} from '../../../shared/ipc.js';

export type AgentRuntimeOptions = {
  chatId: string;
  input: string;
  preferredModelId?: string;
  thinking?: AgentThinkingSelection;
  thinkingProfile?: AgentThinkingProfile;
  context?: AgentChatContext;
  mode?: AgentAccessMode;
  approvalMode?: AgentApprovalMode;
  selectedSkillName?: string;
  session: Session;
  attachments?: AgentAttachmentContext[];
  images?: AgentImageContent[];
  signal?: AbortSignal;
  runtimeConfigOverride?: AgentRuntimeConfig;
  toolStreamBridge?: {
    emit?: (event: ToolRuntimeStreamEvent) => void;
  };
};

export interface AgentStreamResult extends AsyncIterable<RunStreamEvent> {
  readonly completed: Promise<void>;
  readonly finalOutput?: unknown;
  readonly state: RunState<AgentContext, Agent<AgentContext>>;
  readonly output: AgentInputItem[];
}

export type ChatTurnResult = {
  result: AgentStreamResult;
  agent: Agent<AgentContext>;
  toolNames: string[];
  thinkingResolution: {
    requested: AgentThinkingSelection | undefined;
    resolvedLevel: string;
    downgradedToOff: boolean;
    downgradeReason?: ThinkingDowngradeReason;
  };
};

export type AgentRuntime = {
  runChatTurn(options: AgentRuntimeOptions): Promise<ChatTurnResult>;
  prepareCompaction(options: {
    chatId: string;
    preferredModelId?: string;
    session: Session;
  }): Promise<CompactionResult>;
  generateTitle(userMessage: string, preferredModelId?: string): Promise<string>;
  getMcpStatus(): McpStatusSnapshot;
  onMcpStatusChange(listener: (event: McpStatusEvent) => void): () => void;
  testMcpServer(input: McpTestInput): Promise<McpTestResult>;
  reloadMcp(): void;
};
