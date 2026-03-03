/**
 * [PROVIDES]: 受管 MCP Runtime 模块导出（启动静默更新 + 解析执行入口）
 * [DEPENDS]: ./updater, ./types
 * [POS]: main/agent-runtime 的 MCP 运行时统一入口
 * [UPDATE]: 2026-03-03 - 拆分为 types/store/npm-installer/resolver/updater 模块并收敛 index 为聚合导出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { createManagedMcpRuntime, mcpRuntime } from './updater.js';
export type {
  InstalledPackageManifest,
  ManagedInstallPolicy,
  ManagedMcpRuntime,
  ManagedMcpRuntimeDeps,
  ManagedMcpRuntimeStateStore,
  ManagedResolveServerResult,
  ManagedRuntimeServerState,
  ManagedRuntimeState,
  ManagedStdioResolutionFailure,
  ManagedStdioResolutionResult,
  ManagedStdioResolvedServer,
} from './types.js';
