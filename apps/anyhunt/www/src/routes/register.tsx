/**
 * [POS]: 注册页面路由
 * [UPDATE]: 2026-01-28 移动端注册完成/关闭返回 /inbox
 *
 * 支持 redirect 参数：
 * - /register?redirect=https://console.anyhunt.app
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { useEffect, useRef } from 'react';
import { useAuthModal } from '@/components/auth/auth-modal';
import { getRedirectUrl } from '@/lib/redirect';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomeListPane } from '@/features/welcome/WelcomeListPane';
import { WelcomeContentPane } from '@/features/welcome/WelcomeContentPane';
import { getIsMobileViewport } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/stores/auth-store';

const registerSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/register')({
  validateSearch: registerSearchSchema,
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: 'Create Account - Anyhunt Dev' },
      { name: 'description', content: 'Create your Anyhunt Dev account' },
    ],
  }),
});

function RegisterPage() {
  const { redirect: searchRedirect } = Route.useSearch();
  const redirectTo = getRedirectUrl(searchRedirect);
  const navigate = useNavigate();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = !isHydrated || !isBootstrapped;
  const { openAuthModal } = useAuthModal();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    if (isLoading) return;

    openedRef.current = true;

    if (isAuthenticated) {
      window.location.href = redirectTo;
      return;
    }

    const fallbackPath = getIsMobileViewport() ? '/inbox' : '/welcome';

    openAuthModal({
      mode: 'register',
      redirectTo: redirectTo === '/' ? null : redirectTo,
      afterAuth: redirectTo === '/' ? () => navigate({ to: fallbackPath }) : null,
      onClose: () => navigate({ to: fallbackPath }),
    });
  }, [isLoading, isAuthenticated, openAuthModal, redirectTo, navigate]);

  return (
    <ReaderThreePane
      list={<WelcomeListPane selectedSlug={null} />}
      detail={<WelcomeContentPane selectedSlug={null} />}
    />
  );
}
