/**
 * [POS]: 统一登录页面路由
 *
 * 支持 redirect 参数：
 * - /login?redirect=https://console.anyhunt.app
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/auth/auth-modal';
import { getRedirectUrl } from '@/lib/redirect';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomePane } from '@/features/welcome/WelcomePane';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: 'Sign In - Anyhunt Dev' },
      { name: 'description', content: 'Sign in to your Anyhunt Dev account' },
    ],
  }),
});

function LoginPage() {
  const { redirect: searchRedirect } = Route.useSearch();
  const redirectTo = getRedirectUrl(searchRedirect);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
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

    openAuthModal({
      mode: 'login',
      redirectTo: redirectTo === '/' ? null : redirectTo,
      afterAuth: redirectTo === '/' ? () => navigate({ to: '/welcome' }) : null,
      onClose: () => navigate({ to: '/welcome' }),
    });
  }, [isLoading, isAuthenticated, openAuthModal, redirectTo, navigate]);

  return (
    <ReaderThreePane
      list={<WelcomePane kind="outline" />}
      detail={<WelcomePane kind="content" />}
    />
  );
}
