/**
 * [POS]: 注册页面路由
 *
 * 支持 redirect 参数：
 * - /register?redirect=https://console.aiget.dev
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/auth/auth-modal';
import { getRedirectUrl } from '@/lib/redirect';
import { ReaderPage } from '@/features/reader/ReaderPage';

const registerSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/register')({
  validateSearch: registerSearchSchema,
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: 'Create Account - Aiget Dev' },
      { name: 'description', content: 'Create your Aiget Dev account' },
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
      afterAuth: redirectTo === '/' ? () => navigate({ to: '/' }) : null,
      onClose: () => navigate({ to: '/' }),
    });
  }, [isLoading, isAuthenticated, openAuthModal, redirectTo, navigate]);

  return <ReaderPage />;
}
