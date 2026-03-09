import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RunContext } from '@openai/agents-core';
import type { AgentContext } from '../types';
import { resolveToolPermissionTargets } from '../permission';

describe('resolveToolPermissionTargets', () => {
  it('ask 模式下前导斜杠 glob 仍应映射为 vault 目标', () => {
    const context = new RunContext<AgentContext>({
      chatId: 'chat-0',
      vaultRoot: '/vault',
      mode: 'ask',
    });

    const result = resolveToolPermissionTargets({
      toolName: 'glob',
      input: {
        pattern: '/notes/**/*.md',
      },
      runContext: context,
      pathUtils: path,
    });

    expect(result).toEqual({
      domain: 'read',
      targets: ['vault:notes/**/*.md'],
    });
  });

  it('将包含 ../ 的 glob 模式标记为 fs 目标，避免误判为 vault', () => {
    const context = new RunContext<AgentContext>({
      chatId: 'chat-1',
      vaultRoot: '/vault',
      mode: 'ask',
    });

    const result = resolveToolPermissionTargets({
      toolName: 'grep',
      input: {
        query: 'secret',
        glob: '../**/*.key',
      },
      runContext: context,
      pathUtils: path,
    });

    expect(result).toMatchObject({
      domain: 'read',
      targets: ['fs:/**/*.key'],
      enforcedDecision: 'deny',
      enforcedRulePattern: 'search_pattern_outside_vault',
    });
  });

  it('full_access 模式下绝对 glob 仍应映射为 fs 目标', () => {
    const context = new RunContext<AgentContext>({
      chatId: 'chat-1b',
      vaultRoot: '/vault',
      mode: 'full_access',
    });

    const result = resolveToolPermissionTargets({
      toolName: 'grep',
      input: {
        query: 'secret',
        glob: '/external/logs/*.log',
      },
      runContext: context,
      pathUtils: path,
    });

    expect(result).toEqual({
      domain: 'read',
      targets: ['fs:/external/logs/*.log'],
    });
  });

  it('普通 vault 内 glob 仍保持 vault 目标', () => {
    const context = new RunContext<AgentContext>({
      chatId: 'chat-2',
      vaultRoot: '/vault',
      mode: 'ask',
    });

    const result = resolveToolPermissionTargets({
      toolName: 'glob',
      input: {
        pattern: '**/*.md',
      },
      runContext: context,
      pathUtils: path,
    });

    expect(result).toEqual({
      domain: 'read',
      targets: ['vault:**/*.md'],
    });
  });

  it('ask 模式下 grep traversal 需要直接拒绝，避免先审批再越界执行', () => {
    const context = new RunContext<AgentContext>({
      chatId: 'chat-3',
      vaultRoot: '/vault',
      mode: 'ask',
    });

    const result = resolveToolPermissionTargets({
      toolName: 'grep',
      input: {
        query: 'token',
        glob: ['notes/**/*.md', '../secrets/*.key'],
      },
      runContext: context,
      pathUtils: path,
    });

    expect(result).toMatchObject({
      domain: 'read',
      targets: ['vault:notes/**/*.md', 'fs:/secrets/*.key'],
      enforcedDecision: 'deny',
      enforcedRulePattern: 'search_pattern_outside_vault',
    });
  });
});
