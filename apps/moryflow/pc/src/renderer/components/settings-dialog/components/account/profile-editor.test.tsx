import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfileEditor } from './profile-editor';

const mocks = vi.hoisted(() => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/server', () => ({
  fetchProfile: mocks.fetchProfile,
  updateProfile: mocks.updateProfile,
  useAuth: () => ({
    refresh: mocks.refresh,
  }),
}));

describe('ProfileEditor', () => {
  beforeEach(() => {
    mocks.fetchProfile.mockReset();
    mocks.updateProfile.mockReset();
    mocks.refresh.mockReset();
    mocks.fetchProfile.mockResolvedValue({
      userId: 'user_1',
      displayName: 'Server Name',
      avatarUrl: undefined,
    });
    mocks.updateProfile.mockResolvedValue({
      userId: 'user_1',
      displayName: 'Updated Name',
      avatarUrl: undefined,
    });
    mocks.refresh.mockResolvedValue(true);
  });

  it('loads profile and saves updated display name', async () => {
    const onSaved = vi.fn();

    render(<ProfileEditor initialDisplayName="Initial" onSaved={onSaved} />);

    const input = await screen.findByLabelText('nickname');
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('Server Name');
    });

    fireEvent.change(input, { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveChanges' }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({ displayName: 'Updated Name' });
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  }, 30_000);

  it('shows error when profile update fails', async () => {
    mocks.updateProfile.mockRejectedValueOnce(new Error('Save failed'));

    render(<ProfileEditor initialDisplayName="Initial" />);

    const input = await screen.findByLabelText('nickname');
    fireEvent.change(input, { target: { value: 'Broken Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveChanges' }));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeTruthy();
    });
  }, 30_000);

  it('allows clearing display name', async () => {
    render(<ProfileEditor initialDisplayName="Initial" />);

    const input = await screen.findByLabelText('nickname');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'saveChanges' }));

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({ displayName: '' });
    });
  }, 30_000);
});
