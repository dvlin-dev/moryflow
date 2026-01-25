/**
 * [PROVIDES]: PC Permission Runtime 组装（规则评估/审计/包装）
 * [DEPENDS]: agents-runtime/permission, agents-adapter
 * [POS]: PC Agent Runtime 权限控制入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import type { Tool, RunContext } from '@openai/agents-core';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import {
  buildDefaultPermissionRules,
  createPermissionDeniedOutput,
  evaluatePermissionDecision,
  resolveToolPermissionTargets,
  wrapToolsWithPermission,
  type PermissionDecision,
  type PermissionDecisionInfo,
  type PermissionRule,
} from '@anyhunt/agents-runtime';
import type { AgentContext } from '@anyhunt/agents-runtime';
import { createDesktopPermissionRuleStore } from './permission-store';
import { createDesktopPermissionAuditWriter } from './permission-audit';

type PermissionDecisionRecord = PermissionDecisionInfo & { sessionId: string };

export type PermissionRuntime = {
  wrapTools: (tools: Tool<AgentContext>[]) => Tool<AgentContext>[];
  getDecision: (callId: string) => PermissionDecisionRecord | undefined;
  clearDecision: (callId: string) => void;
  persistAlwaysRules: (record: PermissionDecisionRecord) => Promise<void>;
  recordDecision: (
    record: PermissionDecisionRecord,
    decisionOverride?: PermissionDecision,
    rulePatternOverride?: string
  ) => Promise<void>;
};

const getMcpServerIdFromTool = (tool: Tool<AgentContext>): string | undefined => {
  return (tool as { __mcpServerId?: string }).__mcpServerId;
};

let permissionRuntime: PermissionRuntime | null = null;

export const createPermissionRuntime = (input: {
  capabilities: PlatformCapabilities;
  getMcpServerIds: () => string[];
}): PermissionRuntime => {
  const { capabilities, getMcpServerIds } = input;
  const ruleStore = createDesktopPermissionRuleStore();
  const auditWriter = createDesktopPermissionAuditWriter();
  const decisionStore = new Map<string, PermissionDecisionRecord>();

  const buildRecord = (
    info: PermissionDecisionInfo,
    runContext?: RunContext<AgentContext>
  ): PermissionDecisionRecord => ({
    ...info,
    sessionId: runContext?.context?.chatId ?? 'unknown',
  });

  const recordDecision = async (
    record: PermissionDecisionRecord,
    decisionOverride?: PermissionDecision,
    rulePatternOverride?: string
  ) => {
    await auditWriter.append({
      eventId: randomUUID(),
      sessionId: record.sessionId,
      mode: 'agent',
      decision: decisionOverride ?? record.decision,
      permissionDomain: record.domain,
      targets: record.targets,
      rulePattern: rulePatternOverride ?? record.rulePattern,
      timestamp: Date.now(),
    });
  };

  const persistAlwaysRules = async (record: PermissionDecisionRecord) => {
    const rules: PermissionRule[] = record.targets.map((target) => ({
      domain: record.domain,
      pattern: target,
      decision: 'allow',
    }));
    await ruleStore.appendRules(rules);
  };

  const wrapTools = (tools: Tool<AgentContext>[]): Tool<AgentContext>[] =>
    wrapToolsWithPermission(
      tools,
      async ({ toolName, input, callId, runContext }) => {
        const targets = resolveToolPermissionTargets({
          toolName,
          input,
          callId,
          runContext,
          pathUtils: capabilities.path,
          mcpServerId: getMcpServerIdFromTool(
            tools.find((tool) => tool.name === toolName) ??
              ({ name: toolName } as Tool<AgentContext>)
          ),
        });
        if (!targets) return null;
        const userRules = await ruleStore.getRules();
        const rules = [
          ...buildDefaultPermissionRules({ mcpServerIds: getMcpServerIds() }),
          ...userRules,
        ];
        const decision = evaluatePermissionDecision({
          domain: targets.domain,
          targets: targets.targets,
          rules,
        });
        const info: PermissionDecisionInfo = {
          toolName,
          callId,
          ...decision,
        };
        const record = buildRecord(info, runContext);
        if (callId) {
          decisionStore.set(callId, record);
        }
        await recordDecision(record);
        return info;
      },
      {
        onClearDecision: (callId) => decisionStore.delete(callId),
        buildDeniedOutput: createPermissionDeniedOutput,
      }
    );

  return {
    wrapTools,
    getDecision: (callId) => decisionStore.get(callId),
    clearDecision: (callId) => decisionStore.delete(callId),
    persistAlwaysRules,
    recordDecision,
  };
};

export const initPermissionRuntime = (input: {
  capabilities: PlatformCapabilities;
  getMcpServerIds: () => string[];
}): PermissionRuntime => {
  permissionRuntime = createPermissionRuntime(input);
  return permissionRuntime;
};

export const getPermissionRuntime = (): PermissionRuntime | null => permissionRuntime;
