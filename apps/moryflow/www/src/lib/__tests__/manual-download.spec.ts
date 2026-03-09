import { describe, expect, test, vi } from 'vitest';
import { triggerManualDownload } from '../../../../shared/manual-download';

describe('triggerManualDownload', () => {
  test('uses same-tab anchor navigation without popup-only target', () => {
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const click = vi.fn();
    const link = {
      href: '',
      rel: '',
      style: { display: '' },
      click,
    };
    const doc = {
      createElement: vi.fn().mockReturnValue(link),
      body: {
        appendChild,
        removeChild,
      },
    };

    triggerManualDownload('https://example.com/file.dmg', doc as never);

    expect(doc.createElement).toHaveBeenCalledWith('a');
    expect(link.href).toBe('https://example.com/file.dmg');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.style.display).toBe('none');
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledWith(link);
    expect('target' in link).toBe(false);
  });
});
