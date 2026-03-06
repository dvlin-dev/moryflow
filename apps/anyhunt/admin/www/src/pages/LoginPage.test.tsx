import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

const navigateMock = vi.fn();
const signInMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/auth/auth-methods', () => ({
  authMethods: {
    signIn: (...args: unknown[]) => signInMock(...args),
  },
}));

describe('Admin LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits credentials and navigates to dashboard on success', async () => {
    signInMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@anyhunt.app' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('admin@anyhunt.app', 'secret');
    });
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows error message when sign-in fails', async () => {
    signInMock.mockRejectedValueOnce(new Error('Admin access required'));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@anyhunt.app' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Admin access required')).toBeTruthy();
    });
  });
});
