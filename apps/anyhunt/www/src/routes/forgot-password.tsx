/**
 * [POS]: 忘记密码页面路由
 * [UPDATE]: 2026-01-28 移动端关闭返回 /inbox
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAuthModal } from '@/components/auth/auth-modal';
import { ReaderThreePane } from '@/features/reader-shell/ReaderThreePane';
import { WelcomeListPane } from '@/features/welcome/WelcomeListPane';
import { WelcomeContentPane } from '@/features/welcome/WelcomeContentPane';
import { getIsMobileViewport } from '@/hooks/useIsMobile';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: 'Reset Password - Anyhunt Dev' },
      { name: 'description', content: 'Reset your Anyhunt Dev password' },
    ],
  }),
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();
  const openedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    const fallbackPath = getIsMobileViewport() ? '/inbox' : '/welcome';

    openAuthModal({
      mode: 'forgotPassword',
      onClose: () => navigate({ to: fallbackPath }),
    });
  }, [openAuthModal, navigate]);

  return (
    <ReaderThreePane
      list={<WelcomeListPane selectedSlug={null} />}
      detail={<WelcomeContentPane selectedSlug={null} />}
    />
  );
}
