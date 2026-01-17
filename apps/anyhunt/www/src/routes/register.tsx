/**
 * [POS]: 注册页面路由
 *
 * 支持 redirect 参数：
 * - /register?redirect=https://console.anyhunt.app
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/auth/auth-modal';
import { getRedirectUrl } from '@/lib/redirect';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomePane } from '@/features/welcome/WelcomePane';

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
      mode: 'register',
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
