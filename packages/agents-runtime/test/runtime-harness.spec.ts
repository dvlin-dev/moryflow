import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { AgentInputItem, RunContext } from '@openai/agents-core';

import { compactHistory } from '../src/compaction';
import { createDoomLoopGuard } from '../src/doom-loop';
import {
  evaluatePermissionDecision,
  resolveToolPermissionTargets,
  wrapToolWithPermission,
} from '../src/permission';
import { createToolOutputPostProcessor, isTruncatedToolOutput } from '../src/tool-output';
import type { AgentContext } from '../src/types';

type RuntimeHarnessFixture =
  | {
      scenario: 'permission';
      name: string;
      platform: string;
      mode: 'ask' | 'full_access';
      history: AgentInputItem[];
      toolCall: { name: string; arguments: { path: string } };
      expected: {
        events: string[];
        taskState: string;
        traceMarkers: string[];
        output: string;
      };
    }
  | {
      scenario: 'compaction';
      name: string;
      platform: string;
      mode: 'ask' | 'full_access';
      history: AgentInputItem[];
      config: {
        contextWindow: number;
        fallbackCharLimit: number;
        protectedTurns: number;
      };
      summary: string;
      expected: {
        events: string[];
        taskState: string;
        traceMarkers: string[];
        summaryPrefix: string;
        removedCallIds: string[];
        keptCallIds: string[];
      };
    }
  | {
      scenario: 'doom-loop';
      name: string;
      platform: string;
      mode: 'ask' | 'full_access';
      toolCall: { name: string; arguments: Record<string, unknown> };
      repeatCount: number;
      config: {
        sameToolThreshold: number;
        maxToolCalls: number;
        maxAttempts: number;
        cooldownToolCalls: number;
        maxSignatureBytes: number;
      };
      expected: {
        events: string[];
        taskState: string;
        traceMarkers: string[];
      };
    }
  | {
      scenario: 'tool-output';
      name: string;
      platform: string;
      mode: 'ask' | 'full_access';
      toolCall: { name: string; arguments: Record<string, unknown> };
      output: string;
      config: {
        maxLines: number;
        maxBytes: number;
        ttlDays: number;
      };
      expected: {
        events: string[];
        taskState: string;
        traceMarkers: string[];
        preview: string;
        fullPath: string;
      };
    };

type HarnessResult = {
  events: string[];
  taskState: string;
  traceMarkers: string[];
  output?: unknown;
  history?: AgentInputItem[];
};

const pathUtils = {
  join: path.posix.join,
  resolve: path.posix.resolve,
  dirname: path.posix.dirname,
  basename: path.posix.basename,
  extname: path.posix.extname,
  isAbsolute: path.posix.isAbsolute,
  normalize: path.posix.normalize,
  relative: path.posix.relative,
  sep: '/',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'harness-fixtures');

const fixtures = readdirSync(fixturesDir)
  .filter((fileName) => fileName.endsWith('.json'))
  .map((fileName) => {
    const content = readFileSync(path.join(fixturesDir, fileName), 'utf8');
    return JSON.parse(content) as RuntimeHarnessFixture;
  });

const createRunContext = (fixture: RuntimeHarnessFixture) =>
  ({
    context: {
      chatId: `harness:${fixture.name}`,
      vaultRoot: '/vault',
      mode: fixture.mode,
      platform: fixture.platform,
    },
  }) as RunContext<AgentContext>;

const runPermissionFixture = async (
  fixture: Extract<RuntimeHarnessFixture, { scenario: 'permission' }>
): Promise<HarnessResult> => {
  const events: string[] = [];
  const traceMarkers: string[] = [];
  const runContext = createRunContext(fixture);
  const baseTool = {
    type: 'function' as const,
    name: fixture.toolCall.name,
    description: fixture.name,
    needsApproval: async () => false,
    async invoke(_runContext: RunContext<AgentContext>, input: { path: string }) {
      return `read:${input.path}`;
    },
  };

  const wrapped = wrapToolWithPermission(
    baseTool,
    async ({ toolName, input, callId, runContext }) => {
      const targets = resolveToolPermissionTargets({
        toolName,
        input,
        callId,
        runContext,
        pathUtils,
      });
      if (!targets) {
        return null;
      }
      const decision = evaluatePermissionDecision({
        domain: targets.domain,
        targets: targets.targets,
        rules: [
          { domain: 'read', pattern: 'vault:**', decision: 'allow' },
          { domain: 'read', pattern: 'fs:**', decision: 'ask' },
        ],
      });
      return {
        toolName,
        callId,
        ...decision,
      };
    },
    {
      onDecision(info) {
        if (info.decision === 'ask') {
          events.push('permission_ask');
          traceMarkers.push('permission:ask');
        }
      },
    }
  );

  const callId = 'call-1';
  events.push('tool_call_started');
  const needsApproval = await wrapped.needsApproval(runContext, fixture.toolCall.arguments, callId);
  expect(needsApproval).toBe(true);
  events.push('task_paused_for_approval');
  const output = await wrapped.invoke(runContext, fixture.toolCall.arguments, {
    toolCall: {
      callId,
      name: fixture.toolCall.name,
      arguments: fixture.toolCall.arguments,
    },
  } as never);
  events.push('tool_call_resumed');
  traceMarkers.push('permission:resume');
  events.push('tool_call_completed');

  return {
    events,
    taskState: 'completed',
    traceMarkers,
    output,
  };
};

const runCompactionFixture = async (
  fixture: Extract<RuntimeHarnessFixture, { scenario: 'compaction' }>
): Promise<HarnessResult> => {
  const events: string[] = [];
  const traceMarkers: string[] = [];
  const result = await compactHistory({
    history: fixture.history,
    config: fixture.config,
    summaryBuilder: async () => fixture.summary,
  });

  if (result.triggered) {
    events.push('compaction:triggered');
    traceMarkers.push('compaction:triggered');
  }
  if (result.summaryApplied) {
    events.push('compaction:summary_applied');
  }

  return {
    events,
    taskState: result.summaryApplied ? 'compacted' : 'unchanged',
    traceMarkers,
    history: result.history,
  };
};

const runDoomLoopFixture = (
  fixture: Extract<RuntimeHarnessFixture, { scenario: 'doom-loop' }>
): HarnessResult => {
  const events: string[] = [];
  const traceMarkers: string[] = [];
  const runContext = createRunContext(fixture);
  const guard = createDoomLoopGuard({
    config: fixture.config,
  });

  for (let index = 0; index < fixture.repeatCount; index += 1) {
    events.push('tool_call_started');
    const decision = guard.check({
      runContext,
      toolName: fixture.toolCall.name,
      input: fixture.toolCall.arguments,
      callId: `call-${index + 1}`,
    });
    if (decision.action === 'ask') {
      events.push('doom_loop:ask');
      traceMarkers.push('doom_loop:ask');
      return {
        events,
        taskState: 'approval_required',
        traceMarkers,
      };
    }
  }

  return {
    events,
    taskState: 'completed',
    traceMarkers,
  };
};

const runToolOutputFixture = async (
  fixture: Extract<RuntimeHarnessFixture, { scenario: 'tool-output' }>
): Promise<HarnessResult> => {
  const events = ['tool_call_completed'];
  const traceMarkers: string[] = [];
  const runContext = createRunContext(fixture);
  const storage = {
    write: vi.fn(async () => ({ fullPath: fixture.expected.fullPath })),
    cleanup: vi.fn(async () => undefined),
  };
  const postProcess = createToolOutputPostProcessor({
    config: fixture.config,
    storage,
    buildHint: ({ fullPath }) => `Saved at ${fullPath}`,
  });

  const output = await postProcess(fixture.output, {
    toolName: fixture.toolCall.name,
    runContext,
  });

  if (isTruncatedToolOutput(output)) {
    events.push('tool_output:truncated');
    traceMarkers.push('tool_output:truncated');
    if (output.fullPath) {
      events.push('tool_output:externalized');
    }
  }

  return {
    events,
    taskState: 'completed',
    traceMarkers,
    output,
  };
};

const runFixture = async (fixture: RuntimeHarnessFixture): Promise<HarnessResult> => {
  switch (fixture.scenario) {
    case 'permission':
      return runPermissionFixture(fixture);
    case 'compaction':
      return runCompactionFixture(fixture);
    case 'doom-loop':
      return runDoomLoopFixture(fixture);
    case 'tool-output':
      return runToolOutputFixture(fixture);
  }
};

describe('runtime harness fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.name, async () => {
      const result = await runFixture(fixture);

      expect(result.events).toEqual(fixture.expected.events);
      expect(result.taskState).toBe(fixture.expected.taskState);
      expect(result.traceMarkers).toEqual(fixture.expected.traceMarkers);

      if (fixture.scenario === 'permission') {
        expect(result.output).toBe(fixture.expected.output);
      }

      if (fixture.scenario === 'compaction') {
        const history = result.history ?? [];
        const summaryItem = history[0] as { content?: string } | undefined;
        expect(summaryItem?.content).toContain(fixture.expected.summaryPrefix);

        for (const callId of fixture.expected.removedCallIds) {
          expect(history.some((item) => (item as { callId?: string }).callId === callId)).toBe(
            false
          );
        }
        for (const callId of fixture.expected.keptCallIds) {
          expect(history.some((item) => (item as { callId?: string }).callId === callId)).toBe(
            true
          );
        }
      }

      if (fixture.scenario === 'tool-output') {
        expect(isTruncatedToolOutput(result.output)).toBe(true);
        if (isTruncatedToolOutput(result.output)) {
          expect(result.output.preview).toBe(fixture.expected.preview);
          expect(result.output.fullPath).toBe(fixture.expected.fullPath);
        }
      }
    });
  }
});
