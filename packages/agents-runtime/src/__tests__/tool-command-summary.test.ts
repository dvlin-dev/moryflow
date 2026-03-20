import { describe, expect, it } from 'vitest';
import {
  resolveToolCommandSummary,
  resolveToolOuterSummary,
} from '../ui-message/tool-command-summary';
import { resolveToolOuterSummary as resolveToolOuterSummaryFromIndex } from '../index';

describe('ui-message tool-command-summary', () => {
  it('re-exports resolveToolOuterSummary from main index', () => {
    const summary = resolveToolOuterSummaryFromIndex({
      type: 'tool-bash',
      state: 'input-available',
      input: {
        summary: 'list files',
      },
    });

    expect(summary.outerSummary).toBe('list files');
    expect(summary.summarySource).toBe('input');
  });

  it('prefers runtime bash command output', () => {
    const summary = resolveToolCommandSummary({
      type: 'tool-bash',
      input: {
        command: 'echo fallback',
      },
      output: {
        command: 'pnpm',
        args: ['--filter', '@moryflow/pc', 'test:unit'],
      },
    });

    expect(summary).toEqual({
      scriptType: 'Bash',
      command: '$ pnpm --filter @moryflow/pc test:unit',
    });
  });

  it('builds web_search command from query', () => {
    const summary = resolveToolCommandSummary({
      type: 'tool-web_search',
      input: {
        query: 'moryflow tool redesign',
      },
    });

    expect(summary).toEqual({
      scriptType: 'Web Search',
      command: '$ search "moryflow tool redesign"',
    });
  });

  it('builds web_fetch command from url', () => {
    const summary = resolveToolCommandSummary({
      type: 'tool-web_fetch',
      input: {
        url: 'https://example.com',
      },
    });

    expect(summary).toEqual({
      scriptType: 'Web Fetch',
      command: '$ fetch https://example.com',
    });
  });

  it('falls back to run <tool-name> when no key input exists', () => {
    const summary = resolveToolCommandSummary({
      type: 'tool-some_custom_tool',
      input: {},
    });

    expect(summary).toEqual({
      scriptType: 'Some Custom Tool',
      command: '$ run some_custom_tool',
    });
  });

  it('does not preserve removed plan-specific command formatting', () => {
    const summary = resolveToolCommandSummary({
      type: 'tool-update_plan',
      input: {
        tasks: [{ id: 'a' }, { id: 'b' }],
      },
    });

    expect(summary).toEqual({
      scriptType: 'Update Plan',
      command: '$ run update_plan',
    });
  });

  it('uses input.summary as outer summary when present', () => {
    const summary = resolveToolOuterSummary({
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

    expect(summary.outerSummary).toBe('Backend terminal completed and executed git status --sb');
    expect(summary.summarySource).toBe('input');
    expect(summary.command).toBe('$ git status --sb');
  });

  it('falls back to status template when summary is missing', () => {
    const summary = resolveToolOuterSummary({
      type: 'tool-bash',
      state: 'output-available',
      input: {},
      output: {
        command: 'git',
        args: ['status', '--sb'],
      },
      labels: {
        interrupted: ({ tool, command }) => `${tool} interrupted ${command}`,
        success: ({ tool, command }) => `${tool} done ${command}`,
      },
    });

    expect(summary.outerSummary).toBe('Bash done git status --sb');
    expect(summary.summarySource).toBe('fallback');
  });
});
