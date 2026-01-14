/**
 * [POS]: 注册页面路由
 *
 * 支持 redirect 参数：
 * - /register?redirect=https://console.aiget.dev
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Header, Footer, Container } from '@/components/layout';
import { RegisterForm } from '@/components/auth';
import { getRedirectUrl } from '@/lib/redirect';

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center py-12">
        <Container className="max-w-md">
          <RegisterForm redirectTo={redirectTo} />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
