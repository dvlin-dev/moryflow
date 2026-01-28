import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ComponentProps } from 'react';
import { ChatPromptInputPrimaryAction } from './primary-action';

const labels = {
  stopGenerating: 'Stop Generating',
  stopRecording: 'Stop recording',
  send: 'Send',
  startRecording: 'Start recording',
};

const renderAction = (
  overrides: Partial<ComponentProps<typeof ChatPromptInputPrimaryAction>> = {}
) => {
  render(
    <ChatPromptInputPrimaryAction
      canStop={false}
      canUseVoice
      isSpeechActive={false}
      isProcessing={false}
      hasSendableContent={false}
      onStop={() => undefined}
      onToggleRecording={() => undefined}
      labels={labels}
      {...overrides}
    />
  );
};

describe('ChatPromptInputPrimaryAction', () => {
  it('shows stop when generation is active', () => {
    renderAction({ canStop: true, canUseVoice: true });
    expect(screen.getByLabelText(labels.stopGenerating)).not.toBeNull();
  });

  it('shows stop when recording is active', () => {
    renderAction({ isSpeechActive: true, canUseVoice: true });
    expect(screen.getByLabelText(labels.stopRecording)).not.toBeNull();
  });

  it('shows send when content is available', () => {
    renderAction({ hasSendableContent: true, canUseVoice: true });
    const button = screen.getByLabelText(labels.send);
    expect(button.getAttribute('type')).toBe('submit');
  });

  it('shows mic when empty', () => {
    renderAction({ canUseVoice: true });
    expect(screen.getByLabelText(labels.startRecording)).not.toBeNull();
  });

  it('shows disabled send when voice is unavailable and empty', () => {
    renderAction({ canUseVoice: false });
    const button = screen.getByLabelText(labels.send);
    expect(button.getAttribute('disabled')).toBe('');
  });
});
