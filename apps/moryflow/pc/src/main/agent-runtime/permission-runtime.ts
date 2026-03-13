/**
 * [PROVIDES]: PC Permission Runtime 组装（规则评估/审计/包装/全权限自动放行）
 * [DEPENDS]: agents-runtime/permission, agents-adapter
 * [POS]: PC Agent Runtime 权限控制入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { randomUUID } from 'node:crypto';
import type { Tool, RunContext } from '@openai/agents-core';
import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import {
  buildToolPolicyAllowRule,
  buildDefaultPermissionRules,
  createPermissionDeniedOutput,
  evaluatePermissionDecision,
  matchToolPolicy,
  resolveToolPermissionTargets,
  wrapToolsWithPermission,
  type PermissionDecision,
  type PermissionDecisionInfo,
  type PermissionRule,
} from '@moryflow/agents-runtime';
import type { AgentAccessMode, AgentContext } from '@moryflow/agents-runtime';
import { createDesktopPermissionRuleStore } from './permission-store';
import { createDesktopPermissionAuditWriter } from './permission-audit';
import {
  applyFullAccessOverride,
  applyDenyOnAsk,
  getRuleEvaluationTargets,
  resolveExternalPathDecision,
} from './permission-runtime-guards.js';
import { getAuthorizedExternalPaths } from '../sandbox/index.js';

type PermissionDecisionRecord = PermissionDecisionInfo & {
  sessionId: string;
  mode: AgentAccessMode;
};

export type PermissionRuntime = {
  wrapTools: (tools: Tool<AgentContext>[]) => Tool<AgentContext>[];
  getDecision: (callId: string) => PermissionDecisionRecord | undefined;
  clearDecision: (callId: string) => void;
  persistAlwaysRules: (record: PermissionDecisionRecord) => Promise<boolean>;
  recordDecision: (
    record: PermissionDecisionRecord,
    decisionOverride?: PermissionDecision,
    rulePatternOverride?: string
  ) => Promise<void>;
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

  const resolveMode = (runContext?: RunContext<AgentContext>): AgentAccessMode =>
    runContext?.context?.mode ?? 'ask';
  const resolveApprovalMode = (runContext?: RunContext<AgentContext>) =>
    runContext?.context?.approvalMode ?? 'interactive';

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
    const allowRule = buildToolPolicyAllowRule({
      domain: record.domain,
      targets: record.targets,
    });
    if (!allowRule) {
      return false;
    }
    await ruleStore.appendAllowRule(allowRule);
    return true;
  };

  const wrapTools = (tools: Tool<AgentContext>[]): Tool<AgentContext>[] =>
    wrapToolsWithPermission(
      tools,
      async ({ toolName, input, callId, runContext, mcpServerId }) => {
        const mode = resolveMode(runContext);
        const approvalMode = resolveApprovalMode(runContext);
        const targets = resolveToolPermissionTargets({
          toolName,
          input,
          callId,
          runContext,
          pathUtils: capabilities.path,
          mcpServerId,
        });
        if (!targets) return null;
        if (targets.enforcedDecision) {
          const info: PermissionDecisionInfo = {
            toolName,
            callId,
            domain: targets.domain,
            targets: targets.targets,
            decision: targets.enforcedDecision,
            rulePattern: targets.enforcedRulePattern,
          };
          const finalInfo = applyDenyOnAsk(applyFullAccessOverride(info, mode), approvalMode);
          const record = buildRecord(finalInfo, mode, runContext);
          if (callId) {
            decisionStore.set(callId, record);
          }
          await recordDecision(record);
          return finalInfo;
        }
        const toolPolicy =
          runContext?.context?.toolPolicyOverride ?? (await ruleStore.getToolPolicy());
        const toolPolicyMatch = matchToolPolicy({
          domain: targets.domain,
          targets: targets.targets,
          policy: toolPolicy,
        });
        if (toolPolicyMatch.matched) {
          const info: PermissionDecisionInfo = {
            toolName,
            callId,
            domain: targets.domain,
            targets: targets.targets,
            decision: 'allow',
            rulePattern: `tool_policy:${toolPolicyMatch.signature}`,
          };
          const record = buildRecord(info, mode, runContext);
          if (callId) {
            decisionStore.set(callId, record);
          }
          await recordDecision(record);
          return info;
        }
        const externalDecision = resolveExternalPathDecision({
          toolName,
          callId,
          domain: targets.domain,
          targets: targets.targets,
          vaultRoot: runContext?.context?.vaultRoot,
          authorizedPaths: getAuthorizedExternalPaths(),
        });
        const userRules =
          runContext?.context?.permissionRulesOverride ?? (await ruleStore.getRules());
        const rules = [
          ...buildDefaultPermissionRules({ mcpServerIds: getMcpServerIds() }),
          ...userRules,
        ];
        const evaluationTargets = getRuleEvaluationTargets(targets.targets, externalDecision);
        const evaluatedInfo: PermissionDecisionInfo | null =
          evaluationTargets.length === 0
            ? null
            : (() => {
                const decision = evaluatePermissionDecision({
                  domain: targets.domain,
                  targets: evaluationTargets,
                  rules,
                });
                return {
                  toolName,
                  callId,
                  ...decision,
                };
              })();

        const resolvedEvaluatedInfo = evaluatedInfo
          ? applyFullAccessOverride(evaluatedInfo, mode)
          : null;
        const resolvedExternalDecision = externalDecision
          ? applyFullAccessOverride(externalDecision, mode)
          : null;
        let resolvedInfo: PermissionDecisionInfo;
        if (resolvedExternalDecision?.rulePattern === 'external_path_unapproved') {
          resolvedInfo =
            resolvedEvaluatedInfo?.decision === 'deny'
              ? resolvedEvaluatedInfo
              : resolvedExternalDecision;
        } else if (
          resolvedExternalDecision?.rulePattern === 'external_path_authorized' ||
          resolvedExternalDecision?.rulePattern === 'full_access'
        ) {
          resolvedInfo = resolvedEvaluatedInfo ?? resolvedExternalDecision;
        } else if (resolvedEvaluatedInfo) {
          resolvedInfo = resolvedEvaluatedInfo;
        } else {
          resolvedInfo = {
            toolName,
            callId,
            domain: targets.domain,
            targets: targets.targets,
            decision: 'allow',
          };
        }
        const finalInfo = applyDenyOnAsk(resolvedInfo, approvalMode);
        const record = buildRecord(finalInfo, mode, runContext);
        if (callId) {
          decisionStore.set(callId, record);
        }
        await recordDecision(record);
        return finalInfo;
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
