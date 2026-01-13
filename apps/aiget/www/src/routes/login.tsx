/**
 * [POS]: 统一登录页面路由
 *
 * 支持 redirect 参数：
 * - /login?redirect=https://console.aiget.dev
 * - /login?redirect=/dashboard
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Header, Footer, Container } from '@/components/layout';
import { LoginForm } from '@/components/auth';
import { getRedirectUrl } from '@/lib/redirect';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
  head: () => ({
    meta: [
      { title: 'Sign In - Aiget Dev' },
      { name: 'description', content: 'Sign in to your Aiget Dev account' },
    ],
  }),
});

function LoginPage() {
  const { redirect: searchRedirect } = Route.useSearch();
  const redirectTo = getRedirectUrl(searchRedirect);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center py-12">
        <Container className="max-w-md">
          <LoginForm redirectTo={redirectTo} />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
