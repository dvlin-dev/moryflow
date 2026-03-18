import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tool, ToolContent, ToolHeader, ToolOutput, ToolSummary } from '../src/ai/tool';

const originalClipboard = navigator.clipboard;

describe('Tool shell redesign', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('renders summary trigger as inline text with nearby icon', () => {
    render(
      <Tool>
        <ToolSummary summary="Bash completed and executed ls -la" />
      </Tool>
    );

    const summaryText = screen.getByText('Bash completed and executed ls -la');
    const trigger = summaryText.closest('button');
    const triggerTokens = trigger?.className.split(/\s+/) ?? [];

    expect(trigger).not.toBeNull();
    expect(triggerTokens).toContain('inline-flex');
    expect(triggerTokens).not.toContain('w-full');
    expect(summaryText.className).toContain('truncate');
    expect(summaryText.className).toContain('min-w-0');
  });

  it('renders collapsible outer summary text', () => {
    render(
      <Tool>
        <ToolSummary summary="Bash completed and executed git status --sb" />
      </Tool>
    );

    expect(screen.queryByText('Bash completed and executed git status --sb')).not.toBeNull();
  });

  it('renders two-line header with script type and command', () => {
    render(
      <Tool open>
        <ToolSummary summary="Bash completed and executed pnpm test" />
        <ToolHeader
          type="tool-bash"
          state="input-available"
          scriptType="Bash"
          command="$ pnpm test"
        />
        <ToolContent open state="input-available">
          <ToolOutput
            output={{
              command: 'pnpm',
              args: ['test'],
              stdout: 'ok',
            }}
            errorText={undefined}
          />
        </ToolContent>
      </Tool>
    );

    expect(screen.queryByText('Bash')).not.toBeNull();
    expect(screen.queryByText('$ pnpm test')).not.toBeNull();
  });

  it('renders fixed-height output shell, copy button and floating status', () => {
    render(
      <Tool open>
        <ToolSummary summary="Bash completed and executed pnpm --filter @moryflow/pc test:unit" />
        <ToolHeader
          type="tool-bash"
          state="output-available"
          scriptType="Bash"
          command="$ pnpm --filter @moryflow/pc test:unit"
        />
        <ToolContent open state="output-available">
          <ToolOutput
            output={{
              command: 'pnpm',
              args: ['--filter', '@moryflow/pc', 'test:unit'],
              stdout: 'test output',
            }}
            errorText={undefined}
          />
        </ToolContent>
      </Tool>
    );

    expect(screen.queryByTestId('tool-output-scroll')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy output' })).not.toBeNull();
    expect(screen.queryByText('Success')).not.toBeNull();
  });

  it('keeps both vertical and horizontal scrolling capability for overflowing output', () => {
    render(
      <Tool open>
        <ToolSummary summary="Bash completed and executed ls -la" />
        <ToolHeader
          type="tool-bash"
          state="output-available"
          scriptType="Bash"
          command="$ ls -la"
        />
        <ToolContent open state="output-available">
          <ToolOutput
            output={{
              command: 'ls',
              args: ['-la'],
              stdout:
                'this-is-a-very-long-line-that-should-stay-on-one-line-and-overflow-horizontally',
            }}
            errorText={undefined}
          />
        </ToolContent>
      </Tool>
    );

    const scrollArea = screen.getByTestId('tool-output-scroll');
    const pre = scrollArea.querySelector('pre');

    expect(pre).not.toBeNull();
    expect(pre?.className).toContain('whitespace-pre');
    expect(pre?.className).not.toContain('whitespace-pre-wrap');

    expect(scrollArea.className).toContain('[&>[data-slot=scroll-area-viewport]]:h-auto');
    expect(scrollArea.className).toContain('[&>[data-slot=scroll-area-viewport]]:max-h-[168px]');
  });

  it('keeps Apply to file action for diff output', async () => {
    const onApplyDiff = vi.fn(async () => undefined);

    render(
      <ToolOutput
        output={{
          path: 'src/app.ts',
          baseSha: 'a'.repeat(64),
          patch: '--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-old\n+new\n',
        }}
        errorText={undefined}
        onApplyDiff={onApplyDiff}
      />
    );

    const button = screen.queryByRole('button', { name: 'Apply to file' });
    expect(button).not.toBeNull();
    await act(async () => {
      fireEvent.click(button!);
    });
    expect(onApplyDiff).toHaveBeenCalledTimes(1);
  });

  it('clears output copy timer on rapid clicks and unmount', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const view = render(
      <ToolOutput
        output={{
          command: 'ls',
          args: ['-la'],
          stdout: 'ok',
        }}
        errorText={undefined}
      />
    );

    const button = screen.getByRole('button', { name: 'Copy output' });

    await act(async () => {
      fireEvent.click(button);
    });
    const firstTimerId = setTimeoutSpy.mock.results.at(-1)?.value;
    await act(async () => {
      fireEvent.click(button);
    });
    const secondTimerId = setTimeoutSpy.mock.results.at(-1)?.value;

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(firstTimerId).toBeDefined();
    expect(secondTimerId).toBeDefined();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimerId);

    view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(secondTimerId);
  });
});
