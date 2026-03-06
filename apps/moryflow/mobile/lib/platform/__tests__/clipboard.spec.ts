import { describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from '../clipboard';

describe('copyTextToClipboard', () => {
  it('uses web clipboard when platform is web and API exists', async () => {
    const writeWebText = vi.fn(async () => undefined);
    const writeNativeText = vi.fn(async () => undefined);

    const copied = await copyTextToClipboard('hello', {
      platformOS: 'web',
      webClipboard: {
        writeText: writeWebText,
      },
      writeNativeText,
    });

    expect(copied).toBe(true);
    expect(writeWebText).toHaveBeenCalledTimes(1);
    expect(writeWebText).toHaveBeenCalledWith('hello');
    expect(writeNativeText).not.toHaveBeenCalled();
  });

  it('falls back to native clipboard on non-web platforms', async () => {
    const writeNativeText = vi.fn(async () => undefined);

    const copied = await copyTextToClipboard('hello', {
      platformOS: 'ios',
      writeNativeText,
    });

    expect(copied).toBe(true);
    expect(writeNativeText).toHaveBeenCalledTimes(1);
    expect(writeNativeText).toHaveBeenCalledWith('hello');
  });

  it('returns false when text is empty', async () => {
    const writeNativeText = vi.fn(async () => undefined);

    const copied = await copyTextToClipboard('', {
      platformOS: 'ios',
      writeNativeText,
    });

    expect(copied).toBe(false);
    expect(writeNativeText).not.toHaveBeenCalled();
  });

  it('returns false when clipboard write fails', async () => {
    const writeNativeText = vi.fn(async () => {
      throw new Error('clipboard unavailable');
    });

    const copied = await copyTextToClipboard('hello', {
      platformOS: 'android',
      writeNativeText,
    });

    expect(copied).toBe(false);
    expect(writeNativeText).toHaveBeenCalledTimes(1);
  });
});
