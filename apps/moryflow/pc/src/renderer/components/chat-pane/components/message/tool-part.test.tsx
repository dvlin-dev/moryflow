import { act, fireEvent, render, screen } from '@testing-library/react';
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
  ToolHeader: ({
    type,
    scriptType,
    command,
  }: {
    type: string;
    scriptType?: string;
    command?: string;
  }) => (
    <div data-testid="header">
      <span data-testid="header-type">{type}</span>
      <span data-testid="header-script-type">{scriptType ?? ''}</span>
      <span data-testid="header-command">{command ?? ''}</span>
    </div>
  ),
  ToolContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ToolInput: () => <div data-testid="tool-input">tool-input</div>,
  ToolOutput: ({ output }: { output: unknown }) => (
    <div data-testid="tool-output">{String(output)}</div>
  ),
}));

vi.mock('@moryflow/ui/ai/confirmation', () => ({
  Confirmation: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationAccepted: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConfirmationAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} type="button">
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
    approvalAlreadyHandled: 'already handled',
    approveOnce: 'once',
    approveAlways: 'always',
    denyOnce: 'deny',
    approvalHowToApplyTitle: 'how to apply',
    approvalAlwaysAllowHint: 'always allow hint',
  },
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

  it('renders already handled text when approval response is already_processed', () => {
    render(
      <ToolPart
        part={{
          type: 'tool-search',
          toolCallId: 'tool-approval-responded',
          state: 'approval-responded',
          input: { summary: 'search' },
          approval: {
            id: 'approval-1',
            approved: true,
            reason: 'already_processed',
          },
        }}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    expect(screen.queryByText('already handled')).not.toBeNull();
    expect(screen.queryByText('granted')).toBeNull();
  });

  it('approval actions emit once / allow_type / deny', async () => {
    const onToolApproval = vi.fn();
    render(
      <ToolPart
        part={{
          type: 'tool-search',
          toolCallId: 'tool-approval-requested',
          state: 'approval-requested',
          input: { summary: 'search' },
          approval: {
            id: 'approval-1',
          },
        }}
        index={0}
        messageId="m-1"
        toolModel={{
          ...TOOL_MODEL,
          onToolApproval,
        }}
      />
    );

    expect(screen.queryByText('how to apply')).not.toBeNull();
    expect(screen.queryByText('always allow hint')).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByText('once'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('always'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('deny'));
    });

    expect(onToolApproval.mock.calls).toEqual([
      [{ approvalId: 'approval-1', action: 'once' }],
      [{ approvalId: 'approval-1', action: 'allow_type' }],
      [{ approvalId: 'approval-1', action: 'deny' }],
    ]);
  });

  it('passes bash script type and command summary to ToolHeader', () => {
    render(
      <ToolPart
        part={{
          type: 'tool-bash',
          toolCallId: 'tool-bash-1',
          state: 'output-available',
          input: {},
          output: {
            command: 'pnpm',
            args: ['--filter', '@moryflow/pc', 'test:unit'],
          },
        }}
        index={0}
        messageId="m-1"
        toolModel={TOOL_MODEL}
      />
    );

    expect(screen.queryByTestId('header-script-type')?.textContent).toBe('Bash');
    expect(screen.queryByTestId('header-command')?.textContent).toBe(
      '$ pnpm --filter @moryflow/pc test:unit'
    );
  });
});
