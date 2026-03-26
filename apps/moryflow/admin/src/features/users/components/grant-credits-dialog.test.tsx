import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrantCreditsDialog } from './grant-credits-dialog';

describe('GrantCreditsDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('同一次打开周期内重复提交应复用同一个 request nonce', async () => {
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('nonce-1');

    render(
      <GrantCreditsDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('输入积分数量'), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByRole('button', { name: '确认发放' }));
    fireEvent.click(screen.getByRole('button', { name: '确认发放' }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(2));

    expect(handleSubmit).toHaveBeenNthCalledWith(1, {
      type: 'subscription',
      amount: 100,
      reason: undefined,
      requestNonce: 'nonce-1',
    });
    expect(handleSubmit).toHaveBeenNthCalledWith(2, {
      type: 'subscription',
      amount: 100,
      reason: undefined,
      requestNonce: 'nonce-1',
    });
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
  });
});
