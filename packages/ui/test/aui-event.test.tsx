import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { emitAuiEvent, useAuiEvent } from '../src/ai/assistant-ui/utils/hooks/useAuiEvent';

const EventListener = () => {
  const [count, setCount] = useState(0);
  useAuiEvent('thread.runStart', () => setCount((prev) => prev + 1));
  return <div data-testid="count">{count}</div>;
};

describe('useAuiEvent', () => {
  it('emits events to listeners', () => {
    render(<EventListener />);
    expect(screen.getByTestId('count').textContent).toBe('0');

    act(() => {
      emitAuiEvent('thread.runStart');
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
