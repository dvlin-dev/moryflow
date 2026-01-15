/**
 * [PROVIDES]: createRouter, getRouter
 * [DEPENDS]: @tanstack/react-router
 * [POS]: TanStack Start Router 工厂（SSR 必须每请求新建）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/docs/CLAUDE.md`
 */

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
  // 否则 Router 会被“第一次请求”的 Host/Proto 污染，导致后续出现自重定向循环（Too many redirects）。
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
