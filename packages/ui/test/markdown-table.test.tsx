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

  it('escapes markdown table cell separators before copy', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <MarkdownTable>
        <thead>
          <tr>
            <th>Command</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>a | b</td>
            <td>{'line1\nline2'}</td>
          </tr>
        </tbody>
      </MarkdownTable>
    );

    const button = screen.getByRole('button', { name: 'Copy as Markdown' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain('a \\| b');
    expect(copied).toContain('line1<br />line2');
  });

  it('keeps the copy action discoverable without hover-only affordance', () => {
    render(
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
    expect(button.className).toContain('focus-visible:opacity-100');
    expect(button.className).toContain('[@media(any-hover:hover)]:opacity-0');
    expect(button.className).toContain('[@media(any-hover:hover)]:group-hover/table:opacity-100');
  });
});
