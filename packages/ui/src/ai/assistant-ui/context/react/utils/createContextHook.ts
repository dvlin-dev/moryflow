/**
 * [PROVIDES]: createContextHook - assistant-ui 上下文工具
 * [DEPENDS]: React
 * [POS]: mirror @assistant-ui/react createContextHook（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

"use client";

import { useContext, Context } from "react";

/**
 * Creates a context hook with optional support.
 * @param context - The React context to consume.
 * @param providerName - The name of the provider for error messages.
 * @returns A hook function that provides the context value.
 */
export function createContextHook<T>(
  context: Context<T | null>,
  providerName: string,
) {
  function useContextHook(options?: {
    optional?: boolean | undefined;
  }): T | null {
    const contextValue = useContext(context);
    if (!options?.optional && !contextValue) {
      throw new Error(`This component must be used within ${providerName}.`);
    }
    return contextValue;
  }

  return useContextHook;
}
