import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownTable } from '../src/ai/markdown-table';

const originalClipboard = navigator.clipboard;

describe('MarkdownTable', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('clears copy timer on unmount', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const view = render(
      <MarkdownTable>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Users</td>
          </tr>
        </tbody>
      </MarkdownTable>
    );

    const button = screen.getByRole('button', { name: 'Copy as Markdown' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
