/**
 * [POS]: 忘记密码页面路由
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAuthModal } from '@/components/auth/auth-modal';
import { ReaderPage } from '@/features/reader/ReaderPage';

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

    openAuthModal({
      mode: 'forgotPassword',
      onClose: () => navigate({ to: '/' }),
    });
  }, [openAuthModal, navigate]);

  return <ReaderPage />;
}
