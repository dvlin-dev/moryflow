import { describe, expect, it } from 'vitest';
import { resolveMobileToolShell, type MobileToolState } from '../tool-shell';

describe('mobile tool shell', () => {
  it('maps tool state to floating status label', () => {
    const states: Array<{ state: MobileToolState; label: string }> = [
      { state: 'input-streaming', label: 'Running' },
      { state: 'input-available', label: 'Running' },
      { state: 'approval-requested', label: 'Running' },
      { state: 'output-available', label: 'Success' },
      { state: 'output-error', label: 'Error' },
      { state: 'output-denied', label: 'Skipped' },
    ];

    for (const item of states) {
      const shell = resolveMobileToolShell({
        type: 'tool-bash',
        state: item.state,
        input: {},
        output: undefined,
      });
      expect(shell.statusLabel).toBe(item.label);
    }
  });

  it('uses runtime command output as header command for bash', () => {
    const shell = resolveMobileToolShell({
      type: 'tool-bash',
      state: 'output-available',
      input: {},
      output: {
        command: 'pnpm',
        args: ['--filter', '@moryflow/pc', 'test:unit'],
      },
    });

    expect(shell.scriptType).toBe('Bash');
    expect(shell.command).toBe('$ pnpm --filter @moryflow/pc test:unit');
    expect(shell.outerSummary).toBe('Bash completed pnpm --filter @moryflow/pc test:unit');
    expect(shell.outputMaxHeight).toBe(180);
  });

  it('prefers tool input summary as outer summary', () => {
    const shell = resolveMobileToolShell({
      type: 'tool-bash',
      state: 'output-available',
      input: {
        summary: 'Backend terminal completed and executed git status --sb',
      },
      output: {
        command: 'git',
        args: ['status', '--sb'],
      },
    });

    expect(shell.outerSummary).toBe('Backend terminal completed and executed git status --sb');
  });
});
