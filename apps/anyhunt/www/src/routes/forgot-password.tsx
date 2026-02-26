/**
 * [POS]: 忘记密码页面路由
 * [UPDATE]: 2026-01-28 移动端关闭返回 /inbox
 */
import { createFileRoute } from '@tanstack/react-router';
import { AuthModalRouteShell } from '@/features/reader-shell/AuthModalRouteShell';

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
  return <AuthModalRouteShell mode="forgotPassword" />;
}
