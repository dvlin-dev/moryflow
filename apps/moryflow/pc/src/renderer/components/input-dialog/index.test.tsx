import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InputDialog } from './index';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type HarnessOptions = {
  defaultValue?: string;
};

const renderDialogHarness = ({ defaultValue = '' }: HarnessOptions = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  const Harness = () => {
    const [open, setOpen] = useState(true);

    return (
      <InputDialog
        open={open}
        title="Rename"
        defaultValue={defaultValue}
        onConfirm={(value) => {
          onConfirm(value);
          setOpen(false);
        }}
        onCancel={() => {
          onCancel();
          setOpen(false);
        }}
      />
    );
  };

  render(<Harness />);

  return {
    onConfirm,
    onCancel,
  };
};

describe('InputDialog', () => {
  it('calls onCancel exactly once from cancel button close flow', () => {
    const { onCancel } = renderDialogHarness();

    fireEvent.click(screen.getByTestId('input-dialog-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel exactly once when pressing Escape', () => {
    const { onCancel } = renderDialogHarness();

    fireEvent.keyDown(screen.getByTestId('input-dialog-input'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onCancel after confirm path closes dialog', () => {
    const { onConfirm, onCancel } = renderDialogHarness({ defaultValue: 'Draft title' });

    fireEvent.click(screen.getByTestId('input-dialog-confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Draft title');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
