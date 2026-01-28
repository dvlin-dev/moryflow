import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSpeechRecording } from './use-speech-recording';

describe('useSpeechRecording', () => {
  it('stops recording when disabled becomes true', async () => {
    const { result, rerender } = renderHook(({ disabled }) => useSpeechRecording({ disabled }), {
      initialProps: { disabled: false },
    });

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.recordingState).toBe('recording');

    rerender({ disabled: true });

    await waitFor(() => {
      expect(result.current.recordingState).toBe('idle');
    });
    expect(result.current.isActive).toBe(false);
  });
});
