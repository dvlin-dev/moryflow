/**
 * [POS]: 注册页面路由
 * [UPDATE]: 2026-01-28 移动端注册完成/关闭返回 /inbox
 *
 * 支持 redirect 参数：
 * - /register?redirect=https://console.anyhunt.app
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { getRedirectUrl } from '@/lib/redirect';
import { AuthModalRouteShell } from '@/features/reader-shell/AuthModalRouteShell';

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
  return <AuthModalRouteShell mode="register" redirectTo={redirectTo} />;
}
