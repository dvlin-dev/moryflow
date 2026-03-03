import { fireEvent, render, screen } from '@testing-library/react';
import { File } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { FileChip } from './index';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('FileChip', () => {
  it('uses auto width with max-width cap', () => {
    render(<FileChip icon={File} label="notes.md" />);

    const chip = screen.getByText('notes.md').closest('div');
    expect(chip?.className).toContain('w-auto');
    expect(chip?.className).toContain('max-w-56');
  });

  it('does not render remove button in readonly mode', () => {
    render(<FileChip icon={File} label="readonly-chip" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders removable icon slot button and triggers remove callback', () => {
    const onRemove = vi.fn();
    render(
      <FileChip icon={File} label="removable-chip" onRemove={onRemove} removeLabel="remove" />
    );

    const removeButton = screen.getByRole('button', { name: 'remove' });
    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
