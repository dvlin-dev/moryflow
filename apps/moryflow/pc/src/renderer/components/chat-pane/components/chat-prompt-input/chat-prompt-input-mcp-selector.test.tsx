import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ChatPromptInputMcpSelector } from './chat-prompt-input-mcp-selector';

vi.mock('./mcp-panel', () => ({
  McpPanel: ({
    onOpenSettings,
    onClose,
  }: {
    onOpenSettings?: (section?: unknown) => void;
    onClose?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenSettings?.('mcp')}>
        open-mcp-settings
      </button>
      <button type="button" onClick={() => onClose?.()}>
        close-mcp-panel
      </button>
    </div>
  ),
}));

const renderSelector = (
  overrides: Partial<ComponentProps<typeof ChatPromptInputMcpSelector>> = {}
) => {
  const onOpenSettings = vi.fn();
  render(
    <ChatPromptInputMcpSelector
      disabled={false}
      onOpenSettings={onOpenSettings}
      label="MCP"
      {...overrides}
    />
  );
  return { onOpenSettings };
};

describe('ChatPromptInputMcpSelector', () => {
  it('opens MCP panel from toolbar icon', () => {
    renderSelector();
    fireEvent.pointerDown(screen.getByLabelText('MCP'));
    expect(screen.getByText('open-mcp-settings')).toBeTruthy();
  });

  it('passes mcp section to settings callback', () => {
    const { onOpenSettings } = renderSelector();
    fireEvent.pointerDown(screen.getByLabelText('MCP'));
    fireEvent.click(screen.getByText('open-mcp-settings'));
    expect(onOpenSettings).toHaveBeenCalledWith('mcp');
  });
});
