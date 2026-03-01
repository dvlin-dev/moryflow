import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUIPart } from 'ai';
import type { MessageBodyToolModel } from './message-body-model';
import { ToolPart } from './tool-part';

vi.mock('@moryflow/ui/ai/tool', () => ({
  Tool: ({
    open,
    onOpenChange,
    children,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <div data-open={String(Boolean(open))} data-testid="tool">
      <button data-testid="toggle" onClick={() => onOpenChange?.(!open)} type="button">
        toggle
      </button>
      {children}
    </div>
  ),
  ToolHeader: ({ type }: { type: string }) => <div data-testid="header">{type}</div>,
  ToolContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ToolInput: () => <div data-testid="tool-input">tool-input</div>,
  ToolOutput: ({ output }: { output: unknown }) => (
    <div data-testid="tool-output">{String(output)}</div>
  ),
}));

vi.mock('@moryflow/ui/ai/confirmation', () => ({
  Confirmation: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationAccepted: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  ConfirmationActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationRequest: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const TOOL_MODEL: MessageBodyToolModel = {
  statusLabels: {},
  outputLabels: {
    result: 'Result',
    error: 'Error',
    targetFile: 'Target file',
    contentTooLong: 'Too long',
    outputTruncated: 'Output truncated',
    viewFullOutput: 'View full output',
    fullOutputPath: 'Full output path',
    applyToFile: 'Apply to file',
    applied: 'Applied',
    applying: 'Applying',
    noTasks: 'No tasks',
    tasksCompleted: () => 'done',
  },
  uiLabels: {
    approvalRequired: 'approval required',
    approvalRequestHint: 'hint',
    approvalGranted: 'granted',
    approveOnce: 'once',
    approveAlways: 'always',
  },
  onOpenFullOutput: async () => {},
  canApplyDiff: false,
  onApplyDiff: async () => {},
  onApplyDiffSuccess: () => {},
  onApplyDiffError: () => {},
};

type TestToolState = Extract<
  ToolUIPart['state'],
  'input-streaming' | 'input-available' | 'output-available'
>;

const buildPart = (state: TestToolState): ToolUIPart => {
  const base = {
    type: 'tool-search' as const,
    toolCallId: `tool-${state}`,
    input: { summary: 'search' },
  };

  if (state === 'output-available') {
    return { ...base, state, output: 'ok' };
  }

  return { ...base, state };
};

describe('ToolPart visibility behavior', () => {
  it('opens by default for in-progress tool states and does not render ToolInput', () => {
    render(
      <ToolPart
        part={buildPart('input-available')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    expect(screen.getByTestId('tool').dataset.open).toBe('true');
    expect(screen.queryByTestId('tool-input')).toBeNull();
  });

  it('auto-collapses immediately after InProgress -> Finished transition', () => {
    const { rerender } = render(
      <ToolPart
        part={buildPart('input-streaming')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    rerender(
      <ToolPart
        part={buildPart('output-available')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );
    expect(screen.getByTestId('tool').dataset.open).toBe('false');
  });

  it('keeps expanded after user manually opens it', () => {
    const { rerender } = render(
      <ToolPart
        part={buildPart('output-available')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    expect(screen.getByTestId('tool').dataset.open).toBe('false');
    fireEvent.click(screen.getByTestId('toggle'));
    expect(screen.getByTestId('tool').dataset.open).toBe('true');

    rerender(
      <ToolPart
        part={buildPart('input-available')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );
    rerender(
      <ToolPart
        part={buildPart('output-available')}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    expect(screen.getByTestId('tool').dataset.open).toBe('true');
  });
});
