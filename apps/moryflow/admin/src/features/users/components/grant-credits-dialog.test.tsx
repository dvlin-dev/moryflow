import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrantCreditsDialog } from './grant-credits-dialog';

const originalRandomUUID = globalThis.crypto.randomUUID;

describe('GrantCreditsDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: originalRandomUUID,
      configurable: true,
    });
  });

  it('randomUUID 不可用时也应生成合法的 UUID request nonce', async () => {
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();
    const getRandomValuesSpy = vi
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((typedArray) => {
        typedArray.set([
          0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa,
          0xbb, 0xcc, 0xdd, 0xee, 0xff,
        ]);
        return typedArray;
      });

    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });

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

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    expect(handleSubmit).toHaveBeenCalledWith({
      type: 'subscription',
      amount: 100,
      reason: undefined,
      requestNonce: '00112233-4455-4677-8899-aabbccddeeff',
    });
    expect(getRandomValuesSpy).toHaveBeenCalledTimes(1);
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
