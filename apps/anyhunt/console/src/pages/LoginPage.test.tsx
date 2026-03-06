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
    useLocation: () => ({ search: '?next=%2Fmemox' }),
  };
});

vi.mock('@/lib/auth/auth-methods', () => ({
  authMethods: {
    signIn: (...args: unknown[]) => signInMock(...args),
  },
}));

describe('Console LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    signInMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits credentials and navigates to next path on success', async () => {
    signInMock.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'dev@anyhunt.app' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('dev@anyhunt.app', 'secret');
    });
    expect(navigateMock).toHaveBeenCalledWith('/memox', { replace: true });
  });

  it('shows api error message when sign-in fails', async () => {
    signInMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'dev@anyhunt.app' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
