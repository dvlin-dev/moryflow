import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '../src/ai/tool';

describe('Tool shell redesign', () => {
  it('renders two-line header with script type and command', () => {
    render(
      <Tool open>
        <ToolHeader
          type="tool-bash"
          state="input-available"
          scriptType="Bash"
          command="$ pnpm test"
        />
        <ToolContent>
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
        <ToolHeader
          type="tool-bash"
          state="output-available"
          scriptType="Bash"
          command="$ pnpm --filter @moryflow/pc test:unit"
        />
        <ToolContent>
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
});
