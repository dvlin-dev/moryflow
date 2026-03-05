import { render, screen } from '@testing-library/react';
import type { ToolUIPart } from 'ai';
import { MessageTool } from './message-tool';

const createToolPart = (overrides: Partial<ToolUIPart> = {}): ToolUIPart =>
  ({
    type: 'tool-search',
    state: 'input-available',
    input: { query: 'example' },
    output: { ok: true },
    errorText: undefined,
    ...overrides,
  }) as ToolUIPart;

describe('MessageTool', () => {
  it('does not render parameters block', () => {
    render(<MessageTool part={createToolPart()} />);

    expect(screen.queryByText('Parameters')).not.toBeInTheDocument();
  });

  it('opens in progress and auto-collapses after finished', () => {
    const { container, rerender } = render(<MessageTool part={createToolPart()} />);
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toHaveAttribute('data-state', 'open');

    rerender(
      <MessageTool
        part={createToolPart({
          state: 'output-available',
        })}
      />
    );

    expect(collapsible).toHaveAttribute('data-state', 'closed');
  });

  it('renders outer summary from command fallback for bash tool', () => {
    render(
      <MessageTool
        part={createToolPart({
          type: 'tool-bash',
          state: 'output-available',
          input: {},
          output: {
            command: 'pnpm',
            args: ['--filter', '@moryflow/pc', 'test:unit'],
          },
        })}
      />
    );

    expect(
      screen.queryByText('Bash completed pnpm --filter @moryflow/pc test:unit')
    ).not.toBeNull();
  });

  it('prefers tool input summary as outer summary', () => {
    render(
      <MessageTool
        part={createToolPart({
          type: 'tool-bash',
          state: 'output-available',
          input: {
            summary: 'Backend terminal completed and executed git status --sb',
          },
          output: {
            command: 'git',
            args: ['status', '--sb'],
          },
        })}
      />
    );

    expect(
      screen.queryByText('Backend terminal completed and executed git status --sb')
    ).not.toBeNull();
  });
});
