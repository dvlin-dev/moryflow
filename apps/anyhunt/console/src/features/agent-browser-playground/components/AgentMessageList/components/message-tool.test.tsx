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
});
