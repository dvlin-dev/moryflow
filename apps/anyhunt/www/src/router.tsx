import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

let clientRouter: ReturnType<typeof createTanStackRouter> | undefined;

export function createRouter(): ReturnType<typeof createTanStackRouter> {
  const isClient = typeof window !== 'undefined';

  if (isClient) {
    if (clientRouter) return clientRouter;

    clientRouter = createTanStackRouter({
      routeTree,
      scrollRestoration: true,
    });

    return clientRouter;
  }

  // SSR 必须每个请求创建新的 Router：
  // TanStack Start 会用当前请求推导 origin/publicHref；
  // 若复用单例 Router，会被“第一次请求”的 Host/Proto 污染，导致后续出现自重定向循环（Too many redirects）。
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
  });
}

export function getRouter() {
  return createRouter();
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createTanStackRouter>;
  }
}
