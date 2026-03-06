/**
 * [PROPS]: mode, redirectTo
 * [POS]: Reader 内认证路由统一弹窗壳层（login/register/forgot-password）
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthModal, type AuthModalMode } from '@/components/auth/auth-modal';
import { WelcomeListPane } from '@/features/welcome/WelcomeListPane';
import { WelcomeContentPane } from '@/features/welcome/WelcomeContentPane';
import { getIsMobileViewport } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/stores/auth-store';
import { ReaderThreePane } from './ReaderThreePane';

interface AuthModalRouteShellProps {
  mode: AuthModalMode;
  redirectTo?: string;
}

function resolveAuthFallbackPath(): '/inbox' | '/welcome' {
  if (getIsMobileViewport()) {
    return '/inbox';
  }

  return '/welcome';
}

function shouldUseExternalRedirect(redirectTo: string | undefined): redirectTo is string {
  if (!redirectTo) return false;
  return redirectTo !== '/';
}

export function AuthModalRouteShell({ mode, redirectTo }: AuthModalRouteShellProps) {
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();

  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const shouldWaitForBootstrap = mode !== 'forgotPassword';
  const isLoading = shouldWaitForBootstrap && (!isHydrated || !isBootstrapped);

  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    if (isLoading) return;

    openedRef.current = true;

    const fallbackPath = resolveAuthFallbackPath();

    if (mode !== 'forgotPassword' && isAuthenticated) {
      if (shouldUseExternalRedirect(redirectTo)) {
        window.location.href = redirectTo;
        return;
      }

      navigate({ to: fallbackPath, replace: true });
      return;
    }

    const useExternalRedirect = shouldUseExternalRedirect(redirectTo);

    openAuthModal({
      mode,
      redirectTo: useExternalRedirect ? redirectTo : null,
      afterAuth:
        mode === 'forgotPassword' || useExternalRedirect
          ? null
          : () => navigate({ to: fallbackPath, replace: true }),
      onClose: () => navigate({ to: fallbackPath, replace: true }),
    });
  }, [isAuthenticated, isLoading, mode, navigate, openAuthModal, redirectTo]);

  return (
    <ReaderThreePane
      list={<WelcomeListPane selectedSlug={null} />}
      detail={<WelcomeContentPane selectedSlug={null} />}
    />
  );
}
