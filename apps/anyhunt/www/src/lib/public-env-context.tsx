/**
 * [PROVIDES]: PublicEnvProvider, usePublicEnv
 * [DEPENDS]: react
 * [POS]: 统一提供 PublicEnv（由 routes/__root loader 注入），供任意组件读取 apiUrl 等配置
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { PublicEnv } from './env';

const PublicEnvContext = createContext<PublicEnv | null>(null);

export function PublicEnvProvider({ env, children }: { env: PublicEnv; children: ReactNode }) {
  return <PublicEnvContext.Provider value={env}>{children}</PublicEnvContext.Provider>;
}

export function usePublicEnv(): PublicEnv {
  const env = useContext(PublicEnvContext);
  if (!env) {
    throw new Error('usePublicEnv must be used within PublicEnvProvider');
  }
  return env;
}
