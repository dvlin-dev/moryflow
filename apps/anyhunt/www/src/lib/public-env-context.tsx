/**
 * [PROVIDES]: PublicEnvProvider, usePublicEnv
 * [DEPENDS]: react
 * [POS]: 统一提供 PublicEnv（由 routes/__root loader 注入），供任意组件读取 apiUrl 等配置
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
