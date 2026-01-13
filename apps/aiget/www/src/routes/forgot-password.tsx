/**
 * [POS]: 忘记密码页面路由
 */
import { createFileRoute } from '@tanstack/react-router';
import { Header, Footer, Container } from '@/components/layout';
import { ForgotPasswordForm } from '@/components/auth';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: 'Reset Password - Aiget Dev' },
      { name: 'description', content: 'Reset your Aiget Dev password' },
    ],
  }),
});

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center py-12">
        <Container className="max-w-md">
          <ForgotPasswordForm />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
