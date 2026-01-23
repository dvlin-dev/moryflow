/**
 * [POS]: 登录重定向组件，将用户导向统一登录页面 (anyhunt.app/login)
 *        避免把 redirect 回跳到 console 的 `/login`，否则登录后会产生死循环。
 */
import { useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { buildUnifiedLoginUrl, resolveLoginRedirectTarget } from './loginRedirect.utils';

export default function LoginRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const disableAutoRedirect = import.meta.env.VITE_E2E_DISABLE_LOGIN_REDIRECT === 'true';

  const { nextPath, returnToUrl } = useMemo(
    () => resolveLoginRedirectTarget(window.location.href),
    []
  );
  const loginUrl = useMemo(
    () =>
      buildUnifiedLoginUrl({
        returnToUrl,
        isDev: import.meta.env.DEV,
        wwwPort: import.meta.env.VITE_WWW_PORT,
      }),
    [returnToUrl]
  );

  useEffect(() => {
    if (disableAutoRedirect) return;
    if (!isBootstrapped) return;
    if (isAuthenticated) return;
    window.location.href = loginUrl;
  }, [disableAutoRedirect, isBootstrapped, isAuthenticated, loginUrl]);

  if (isBootstrapped && isAuthenticated) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 text-lg font-medium">Redirecting to login...</div>
        <div className="text-sm text-muted-foreground">
          <a href={loginUrl} className="underline hover:no-underline">
            Click here if not redirected
          </a>
        </div>
      </div>
    </div>
  );
}
