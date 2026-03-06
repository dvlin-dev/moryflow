/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { RunContext } from '@openai/agents-core';
import { createSandboxBashTool, type BashCommandAuditEvent } from '../src/bash-tool';
import type { SandboxManager } from '../src/sandbox-manager';

type ToolContext = {
  vaultRoot: string;
  chatId: string;
  userId?: string;
};

const createRunContext = () =>
  new RunContext<ToolContext>({
    vaultRoot: '/vault',
    chatId: 'chat-a',
    userId: 'user-a',
  });

describe('createSandboxBashTool', () => {
  it('暴露 Bash-First 描述与长输出提示', () => {
    const sandbox = {
      execute: vi.fn(),
    } as unknown as SandboxManager;

    const bashTool = createSandboxBashTool({
      getSandbox: () => sandbox,
      onAuthRequest: async () => 'allow_always',
    });

    expect(bashTool.description).toContain('Bash-First');
    expect(bashTool.description).toContain('工作目录默认是 Vault 根目录');
    expect(bashTool.description).toContain('长输出建议');
  });

  it('命令成功时写入审计元数据', async () => {
    const sandbox = {
      execute: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        duration: 12,
      }),
    } as unknown as SandboxManager;
    const onCommandAudit = vi.fn(async (_event: BashCommandAuditEvent) => undefined);

    const bashTool = createSandboxBashTool({
      getSandbox: () => sandbox,
      onAuthRequest: async () => 'allow_always',
      onCommandAudit,
    });

    const result = (await bashTool.invoke(
      createRunContext(),
      JSON.stringify({
        command: 'ls -la',
      })
    )) as {
      exitCode: number;
      cwd: string;
      stdout: string;
    };

    expect(result.exitCode).toBe(0);
    expect(result.cwd).toBe('.');
    expect(result.stdout).toBe('ok');
    expect(onCommandAudit).toHaveBeenCalledTimes(1);
    expect(onCommandAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'chat-a',
        userId: 'user-a',
        command: 'ls -la',
        resolvedCwd: '.',
        exitCode: 0,
        failed: false,
      })
    );
  });

  it('命令失败时也写入审计元数据', async () => {
    const sandbox = {
      execute: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as SandboxManager;
    const onCommandAudit = vi.fn(async (_event: BashCommandAuditEvent) => undefined);

    const bashTool = createSandboxBashTool({
      getSandbox: () => sandbox,
      onAuthRequest: async () => 'allow_always',
      onCommandAudit,
    });

    const result = (await bashTool.invoke(
      createRunContext(),
      JSON.stringify({
        command: 'cat missing.txt',
        cwd: 'docs',
      })
    )) as string;

    expect(result).toContain('boom');

    expect(onCommandAudit).toHaveBeenCalledTimes(1);
    expect(onCommandAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'chat-a',
        command: 'cat missing.txt',
        requestedCwd: 'docs',
        resolvedCwd: 'docs',
        exitCode: -1,
        failed: true,
        error: 'boom',
      })
    );
  });
});
