/**
 * [POS]: 登录重定向组件，将用户导向统一登录页面 (anyhunt.app/login)
 */
import { useEffect, useMemo } from 'react';

/**
 * 获取统一登录页面 URL
 */
function getLoginUrl(): string {
  const currentUrl = window.location.href;

  // 开发环境：重定向到本地 www（端口 3001）
  if (import.meta.env.DEV) {
    const wwwPort = import.meta.env.VITE_WWW_PORT || '3001';
    return `http://localhost:${wwwPort}/login?redirect=${encodeURIComponent(currentUrl)}`;
  }

  // 生产环境：重定向到 anyhunt.app
  return `https://anyhunt.app/login?redirect=${encodeURIComponent(currentUrl)}`;
}

export default function LoginRedirect() {
  const loginUrl = useMemo(() => getLoginUrl(), []);

  useEffect(() => {
    window.location.href = loginUrl;
  }, [loginUrl]);

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
