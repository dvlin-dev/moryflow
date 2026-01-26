import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';

import {
  evaluatePermissionDecision,
  resolveToolPermissionTargets,
  wrapToolWithPermission,
  type PermissionDecisionInfo,
  type PermissionRule,
} from '../src/permission';
import type { AgentContext } from '../src/types';

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

describe('permission', () => {
  it('prefers the last matching rule for sensitive files', () => {
    const rules: PermissionRule[] = [
      { domain: 'read', pattern: 'vault:**', decision: 'allow' },
      { domain: 'read', pattern: 'vault:**/*.env*', decision: 'ask' },
    ];
    const result = evaluatePermissionDecision({
      domain: 'read',
      targets: ['vault:/config/.env'],
      rules,
    });
    expect(result.decision).toBe('ask');
    expect(result.rulePattern).toBe('vault:**/*.env*');
  });

  it('resolves vault-relative paths to vault targets', () => {
    const runContext = {
      context: { vaultRoot: '/vault', chatId: 'chat-1' },
    } as RunContext<AgentContext>;
    const targets = resolveToolPermissionTargets({
      toolName: 'read',
      input: { path: 'notes/a.md' },
      runContext,
      pathUtils,
    });
    expect(targets?.targets[0]).toBe('vault:/notes/a.md');
  });

  it('blocks denied tool execution without invoking the tool', async () => {
    let executed = false;
    const baseTool = tool({
      name: 'demo',
      description: 'demo',
      parameters: z.object({ value: z.string() }),
      async execute() {
        executed = true;
        return 'ok';
      },
    });

    const check = async (): Promise<PermissionDecisionInfo> => ({
      toolName: 'demo',
      domain: 'read',
      targets: ['vault:/demo.txt'],
      decision: 'deny',
    });

    const wrapped = wrapToolWithPermission(baseTool, check);
    const runContext = {
      context: { vaultRoot: '/vault', chatId: 'chat-1' },
    } as RunContext<AgentContext>;

    const needsApproval = await wrapped.needsApproval(runContext, { value: 'x' }, 'call-1');
    expect(needsApproval).toBe(false);

    const output = await wrapped.invoke(runContext, { value: 'x' }, {
      toolCall: { callId: 'call-1', name: 'demo', arguments: { value: 'x' } },
    } as any);

    expect(executed).toBe(false);
    expect(output).toMatchObject({ kind: 'permission_denied' });
  });
});
