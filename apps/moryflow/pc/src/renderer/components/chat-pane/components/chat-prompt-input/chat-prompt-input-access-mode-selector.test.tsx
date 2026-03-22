import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import { ChatPromptInputAccessModeSelector } from './chat-prompt-input-access-mode-selector';

const labels = {
  defaultPermission: 'Default Permission',
  fullAccessPermission: 'Full Access',
  appliesGlobal: 'Applies to all chats',
};

const renderSelector = (
  overrides: Partial<ComponentProps<typeof ChatPromptInputAccessModeSelector>> = {}
) => {
  const onModeChange = vi.fn();
  const result = render(
    <ChatPromptInputAccessModeSelector
      disabled={false}
      mode="ask"
      onModeChange={onModeChange}
      labels={labels}
      {...overrides}
    />
  );
  return { onModeChange, ...result };
};

describe('ChatPromptInputAccessModeSelector', () => {
  it('shows shield icon in default permission mode', () => {
    const { container } = renderSelector({ mode: 'ask' });
    const trigger = screen.getByLabelText(labels.defaultPermission);
    expect(trigger).not.toBeNull();
    expect(container.querySelector('svg.lucide-shield')).not.toBeNull();
    expect(container.querySelector('svg.lucide-infinity')).toBeNull();
  });

  it('shows infinity icon in full access mode', () => {
    const { container } = renderSelector({ mode: 'full_access' });
    const trigger = screen.getByLabelText(labels.fullAccessPermission);
    expect(trigger).not.toBeNull();
    expect(container.querySelector('svg.lucide-infinity')).not.toBeNull();
    expect(within(trigger).queryByText('∞')).toBeNull();
  });

  it('emits full_access when full access item is selected', () => {
    const { onModeChange } = renderSelector({ mode: 'ask' });
    fireEvent.pointerDown(screen.getByLabelText(labels.defaultPermission));
    fireEvent.click(screen.getByText(labels.fullAccessPermission));
    expect(onModeChange).toHaveBeenCalledWith('full_access');
  }, 30_000);

  it('emits ask when default permission item is selected', () => {
    const { onModeChange } = renderSelector({ mode: 'full_access' });
    fireEvent.pointerDown(screen.getByLabelText(labels.fullAccessPermission));
    fireEvent.click(screen.getByText(labels.defaultPermission));
    expect(onModeChange).toHaveBeenCalledWith('ask');
  }, 30_000);

  it('does not switch mode when disabled', () => {
    const onModeChange = vi.fn();
    render(
      <ChatPromptInputAccessModeSelector
        disabled
        mode="ask"
        onModeChange={onModeChange}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByLabelText(labels.defaultPermission));
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
