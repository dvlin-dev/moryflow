/* @vitest-environment node */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAdapter, SandboxConfig } from '../src/types';
import { CommandExecutor } from '../src/command/executor';

const platform: PlatformAdapter = {
  type: 'soft-isolation',
  wrapCommand: vi.fn(async (command: string) => command),
};

const config: SandboxConfig = {
  vaultRoot: '/tmp',
  mode: 'ask',
  storage: {
    get: () => undefined,
    set: () => undefined,
  },
};

describe('CommandExecutor streaming', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits stdout/stderr chunks before process exit', async () => {
    const executor = new CommandExecutor(platform, config);
    const events: string[] = [];
    let resolved = false;

    const resultPromise = executor
      .run("printf 'out-1\\n'; sleep 0.05; >&2 printf 'err-1\\n'; sleep 0.05; printf 'out-2\\n'", {
        callbacks: {
          onStdoutChunk: (chunk) => {
            events.push(`stdout:${chunk.trim()}:${resolved ? 'resolved' : 'pending'}`);
          },
          onStderrChunk: (chunk) => {
            events.push(`stderr:${chunk.trim()}:${resolved ? 'resolved' : 'pending'}`);
          },
        },
      })
      .then((result) => {
        resolved = true;
        return result;
      });

    const result = await resultPromise;

    expect(events).toEqual([
      'stdout:out-1:pending',
      'stderr:err-1:pending',
      'stdout:out-2:pending',
    ]);
    expect(result.stdout).toContain('out-1');
    expect(result.stdout).toContain('out-2');
    expect(result.stderr).toContain('err-1');
  });

  it('still returns the full aggregated ExecuteResult at process close', async () => {
    const executor = new CommandExecutor(platform, config);

    const result = await executor.run("printf 'hello'; >&2 printf 'world'");

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: 'hello',
      stderr: 'world',
    });
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('stops emitting chunks after timeout kill', async () => {
    const executor = new CommandExecutor(platform, config);
    const onStdoutChunk = vi.fn();

    await expect(
      executor.run("printf 'tick'; sleep 0.2; printf 'tock'", {
        timeout: 50,
        callbacks: {
          onStdoutChunk,
        },
      })
    ).rejects.toThrow(/timed out/i);

    expect(onStdoutChunk).toHaveBeenCalledTimes(1);
    expect(onStdoutChunk).toHaveBeenCalledWith('tick');
  });
});
