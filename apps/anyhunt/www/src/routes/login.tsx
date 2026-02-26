/**
 * [POS]: 统一登录页面路由
 * [UPDATE]: 2026-01-28 移动端登录完成/关闭返回 /inbox
 *
 * 支持 redirect 参数：
 * - /login?redirect=https://console.anyhunt.app
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';
import { getRedirectUrl } from '@/lib/redirect';
import { AuthModalRouteShell } from '@/features/reader-shell/AuthModalRouteShell';

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
  return <AuthModalRouteShell mode="login" redirectTo={redirectTo} />;
}
