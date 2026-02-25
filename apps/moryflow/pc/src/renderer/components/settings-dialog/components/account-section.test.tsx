import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountSection } from './account-section';

const mockUseAuth = vi.fn();

vi.mock('@/lib/server', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./account/login-panel', () => ({
  LoginPanel: () => <div data-testid="login-panel">login-panel</div>,
}));

vi.mock('./account/user-profile', () => ({
  UserProfile: ({ user }: { user: { email?: string } }) => (
    <div data-testid="user-profile">{user.email ?? 'user-profile'}</div>
  ),
}));

describe('AccountSection', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('未登录加载中时保持登录面板可见（不展示全局 skeleton）', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    render(<AccountSection />);

    expect(screen.getByTestId('login-panel')).toBeTruthy();
    expect(screen.queryByTestId('user-profile')).toBeNull();
  });

  it('已登录加载中时显示 loading 占位，避免过早渲染用户信息', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'demo@moryflow.com' },
      isLoading: true,
      isAuthenticated: true,
    });

    const { container } = render(<AccountSection />);

    expect(screen.queryByTestId('login-panel')).toBeNull();
    expect(screen.queryByTestId('user-profile')).toBeNull();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
