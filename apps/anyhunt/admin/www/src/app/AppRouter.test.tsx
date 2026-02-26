import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { AdminRoutes } from './AppRouter';
import { type AuthUser, useAuthStore } from '@/stores/auth';

const ADMIN_USER: AuthUser = {
  id: 'admin-1',
  email: 'admin@anyhunt.app',
  name: null,
  subscriptionTier: 'enterprise',
  isAdmin: true,
};

function resetAuthStore() {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    isAuthenticated: false,
    isBootstrapped: false,
  });
}

describe('App router guards', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects unauthenticated users to login', async () => {
    useAuthStore.setState({
      isBootstrapped: true,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route
            path="/users"
            element={
              <AuthGuard>
                <div>Protected content</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login page')).toBeTruthy();
  });

  it('redirects authenticated non-admin users to unauthorized', async () => {
    useAuthStore.setState({
      isBootstrapped: true,
      isAuthenticated: true,
      user: {
        ...ADMIN_USER,
        isAdmin: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route
            path="/users"
            element={
              <AuthGuard>
                <div>Protected content</div>
              </AuthGuard>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Unauthorized page')).toBeTruthy();
  });

  it('renders not found page for unknown protected routes', async () => {
    useAuthStore.setState({
      isBootstrapped: true,
      isAuthenticated: true,
      user: ADMIN_USER,
    });

    render(
      <MemoryRouter initialEntries={['/missing-path']}>
        <Suspense fallback={<div>Loading route</div>}>
          <AdminRoutes />
        </Suspense>
      </MemoryRouter>
    );

    expect(await screen.findByText('Page not found')).toBeTruthy();
  });
});
