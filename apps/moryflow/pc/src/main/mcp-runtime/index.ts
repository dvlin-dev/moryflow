/**
 * [PROVIDES]: 受管 MCP Runtime 模块导出（启动静默更新 + 解析执行入口）
 * [DEPENDS]: ./updater, ./types
 * [POS]: main/agent-runtime 的 MCP 运行时统一入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
