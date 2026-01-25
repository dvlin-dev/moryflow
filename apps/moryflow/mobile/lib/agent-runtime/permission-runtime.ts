/**
 * [PROVIDES]: Mobile Permission Runtime 组装（规则评估/审计/包装/全权限自动放行）
 * [DEPENDS]: agents-runtime/permission, agents-adapter
 * [POS]: Mobile Agent Runtime 权限控制入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { randomUUID } from 'expo-crypto';
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
import type { AgentAccessMode, AgentContext } from '@anyhunt/agents-runtime';
import { createMobilePermissionRuleStore } from './permission-store';
import { createMobilePermissionAuditWriter } from './permission-audit';

type PermissionDecisionRecord = PermissionDecisionInfo & {
  sessionId: string;
  mode: AgentAccessMode;
};

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

let permissionRuntime: PermissionRuntime | null = null;

export const createPermissionRuntime = (input: {
  capabilities: PlatformCapabilities;
}): PermissionRuntime => {
  const { capabilities } = input;
  const ruleStore = createMobilePermissionRuleStore();
  const auditWriter = createMobilePermissionAuditWriter();
  const decisionStore = new Map<string, PermissionDecisionRecord>();

  const resolveMode = (runContext?: RunContext<AgentContext>): AgentAccessMode =>
    runContext?.context?.mode ?? 'agent';

  const applyFullAccessOverride = (
    info: PermissionDecisionInfo,
    mode: AgentAccessMode
  ): PermissionDecisionInfo => {
    if (mode !== 'full_access' || info.decision === 'allow') {
      return info;
    }
    return {
      ...info,
      decision: 'allow',
      rule: undefined,
      rulePattern: 'full_access',
    };
  };

  const buildRecord = (
    info: PermissionDecisionInfo,
    mode: AgentAccessMode,
    runContext?: RunContext<AgentContext>
  ): PermissionDecisionRecord => ({
    ...info,
    sessionId: runContext?.context?.chatId ?? 'unknown',
    mode,
  });

  const recordDecision = async (
    record: PermissionDecisionRecord,
    decisionOverride?: PermissionDecision,
    rulePatternOverride?: string
  ) => {
    await auditWriter.append({
      eventId: randomUUID(),
      sessionId: record.sessionId,
      mode: record.mode,
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
        });
        if (!targets) return null;
        const userRules = await ruleStore.getRules();
        const rules = [...buildDefaultPermissionRules(), ...userRules];
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
        const mode = resolveMode(runContext);
        const resolvedInfo = applyFullAccessOverride(info, mode);
        const record = buildRecord(resolvedInfo, mode, runContext);
        if (callId) {
          decisionStore.set(callId, record);
        }
        await recordDecision(record);
        return resolvedInfo;
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

export const initPermissionRuntime = (input: { capabilities: PlatformCapabilities }) => {
  permissionRuntime = createPermissionRuntime(input);
  return permissionRuntime;
};

export const getPermissionRuntime = (): PermissionRuntime | null => permissionRuntime;
