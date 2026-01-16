/**
 * [PROVIDES]: AuthModalProvider, useAuthModal
 * [DEPENDS]: react, /ui, auth forms
 * [POS]: 全局 Auth 弹窗入口（Reader/Developer 均可调用）；避免跳转到 /login /register
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@anyhunt/ui';
import { ResponsiveDialog } from '@/components/reader/ResponsiveDialog';
import { ForgotPasswordForm } from './forgot-password-form';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type AuthModalMode = 'login' | 'register' | 'forgotPassword';

export interface OpenAuthModalOptions {
  mode?: AuthModalMode;
  redirectTo?: string | null;
  afterAuth?: (() => void) | null;
  onClose?: (() => void) | null;
}

interface AuthModalContextValue {
  isOpen: boolean;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('login');

  const redirectToRef = useRef<string | null>(null);
  const afterAuthRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef<(() => void) | null>(null);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    redirectToRef.current = null;
    afterAuthRef.current = null;
    const onClose = onCloseRef.current;
    onCloseRef.current = null;
    onClose?.();
  }, []);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    redirectToRef.current = options?.redirectTo ?? null;
    afterAuthRef.current = options?.afterAuth ?? null;
    onCloseRef.current = options?.onClose ?? null;
    setMode(options?.mode ?? 'login');
    setOpen(true);
  }, []);

  const handleAuthedSuccess = useCallback(() => {
    const redirectTo = redirectToRef.current;
    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }

    setOpen(false);
    redirectToRef.current = null;

    const afterAuth = afterAuthRef.current;
    afterAuthRef.current = null;
    onCloseRef.current = null;

    afterAuth?.();
  }, []);

  const dialogTitle =
    mode === 'register'
      ? 'Create account'
      : mode === 'forgotPassword'
        ? 'Reset password'
        : 'Sign in';

  const value = useMemo<AuthModalContextValue>(
    () => ({ isOpen: open, openAuthModal, closeAuthModal }),
    [open, openAuthModal, closeAuthModal]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : closeAuthModal())}
        title={dialogTitle}
        description={
          mode === 'forgotPassword'
            ? 'Reset your password with a one-time code.'
            : 'Use your email to continue.'
        }
        className="sm:max-w-md"
      >
        {mode === 'forgotPassword' ? (
          <ForgotPasswordForm
            variant="dialog"
            onSuccess={() => setMode('login')}
            onRequestSignIn={() => setMode('login')}
          />
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as AuthModalMode)} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm
                variant="dialog"
                onSuccess={handleAuthedSuccess}
                onRequestRegister={() => setMode('register')}
                onRequestForgotPassword={() => setMode('forgotPassword')}
              />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm
                variant="dialog"
                onSuccess={handleAuthedSuccess}
                onRequestSignIn={() => setMode('login')}
              />
            </TabsContent>
          </Tabs>
        )}
      </ResponsiveDialog>
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
