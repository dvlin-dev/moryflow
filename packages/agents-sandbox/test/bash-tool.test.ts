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
  it('exposes Bash-First description with output guidance', () => {
    const sandbox = {
      execute: vi.fn(),
    } as unknown as SandboxManager;

    const bashTool = createSandboxBashTool({
      getSandbox: () => sandbox,
      onAuthRequest: async () => 'allow_always',
    });

    expect(bashTool.description).toContain('Bash-First');
    expect(bashTool.description).toContain('Vault root');
    expect(bashTool.description).toContain('long output');
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

  it('命令执行时通过 toolStream 发出进度与输出增量', async () => {
    const emit = vi.fn();
    const sandbox = {
      execute: vi
        .fn()
        .mockImplementation(async (_command, _options, _auth, _confirm, callbacks) => {
          callbacks?.onStdoutChunk?.('step 1\n');
          callbacks?.onStderrChunk?.('warn 1\n');
          return {
            exitCode: 0,
            stdout: 'step 1\n',
            stderr: 'warn 1\n',
            duration: 12,
          };
        }),
    } as unknown as SandboxManager;

    const bashTool = createSandboxBashTool({
      getSandbox: () => sandbox,
      onAuthRequest: async () => 'allow_always',
    });

    const result = (await bashTool.invoke(
      new RunContext({
        vaultRoot: '/vault',
        chatId: 'chat-a',
        toolStream: {
          toolCallId: 'call-1',
          toolName: 'bash',
          emit,
        },
      }),
      JSON.stringify({
        command: 'printf step',
      })
    )) as {
      stdout: string;
      stderr: string;
    };

    expect(emit).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'progress' }));
    expect(emit).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'stdout' }));
    expect(emit).toHaveBeenNthCalledWith(3, expect.objectContaining({ kind: 'stderr' }));
    expect(result.stdout).toBe('step 1\n');
    expect(result.stderr).toBe('warn 1\n');
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
