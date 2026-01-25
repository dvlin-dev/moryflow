/**
 * [PROVIDES]: 沙盒化的 bash 工具
 * [DEPENDS]: sandbox-manager, /agents
 * [POS]: 替代原有 bash 工具，添加沙盒保护并交由 runtime 统一截断
 */

import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { SandboxManager } from './sandbox-manager';
import type { AuthChoice } from './types';
import { createSubLogger } from './logger';

const logger = createSubLogger('bash-tool');

/** Agent 上下文类型（兼容 agents-runtime 的 AgentContext） */
interface AgentContext {
  vaultRoot: string;
  chatId: string;
  userId?: string;
  buildModel?: unknown;
}

/** 工具摘要 schema（用于 UI 显示） */
const toolSummarySchema = z
  .string()
  .min(1)
  .max(80)
  .describe('A very brief, human-readable summary of what this tool call is doing');

const DEFAULT_TIMEOUT = 120_000; // 2 分钟
const MAX_TIMEOUT = 180_000; // 3 分钟

/** 工具参数 schema */
const bashParams = z.object({
  summary: toolSummarySchema.default('bash'),
  command: z.string().min(1).describe('要执行的完整命令（包括参数）'),
  cwd: z.string().optional().describe('工作目录（相对于 Vault，默认为 Vault 根目录）'),
  timeout: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TIMEOUT)
    .default(DEFAULT_TIMEOUT)
    .describe('超时时间（毫秒），默认 2 分钟，最大 3 分钟'),
});

/** 沙盒 bash 工具选项 */
export interface SandboxBashToolOptions {
  /** 获取 SandboxManager 的函数（根据 vaultRoot 动态获取） */
  getSandbox: (vaultRoot: string) => SandboxManager;
  /** 路径解析工具（可选） */
  resolvePath?: (
    relativePath: string,
    vaultRoot: string
  ) => Promise<{ absolute: string; relative: string }>;
  /** 授权请求回调 */
  onAuthRequest: (path: string) => Promise<AuthChoice>;
  /**
   * 命令确认回调（用于非白名单命令）
   * 如果不提供，非白名单命令将自动允许（危险命令仍会被拦截）
   */
  onCommandConfirm?: (command: string, reason: string) => Promise<boolean>;
}

/**
 * 创建沙盒化的 bash 工具
 */
export function createSandboxBashTool(options: SandboxBashToolOptions) {
  const { getSandbox, resolvePath, onAuthRequest, onCommandConfirm } = options;

  // 默认命令确认回调：自动允许非白名单命令
  // 危险命令仍会被 SandboxManager 硬性拦截
  const defaultCommandConfirm = async () => true;

  return tool({
    name: 'bash',
    description: '在 Vault 目录下执行 shell 命令。可用于运行脚本、文档转换、Git 操作等。',
    parameters: bashParams,
    async execute({ command, cwd, timeout }, runContext?: RunContext<AgentContext>) {
      logger.debug('execute', { command: command.slice(0, 80), cwd, timeout });

      const vaultRoot = runContext?.context?.vaultRoot;
      if (!vaultRoot) {
        throw new Error('Cannot determine working directory');
      }

      // 获取对应 vault 的沙盒管理器
      const sandbox = getSandbox(vaultRoot);

      // 确定工作目录
      let workDir: string;
      let relativeCwd: string;

      if (cwd && resolvePath) {
        const resolved = await resolvePath(cwd, vaultRoot);
        workDir = resolved.absolute;
        relativeCwd = resolved.relative;
      } else if (cwd) {
        // 简单路径拼接
        workDir = cwd.startsWith('/') ? cwd : `${vaultRoot}/${cwd}`;
        relativeCwd = cwd;
      } else {
        workDir = vaultRoot;
        relativeCwd = '.';
      }

      const startedAt = Date.now();

      try {
        // 使用沙盒执行命令
        const result = await sandbox.execute(
          command,
          { cwd: workDir, timeout },
          onAuthRequest,
          onCommandConfirm ?? defaultCommandConfirm
        );

        const durationMs = Date.now() - startedAt;
        return {
          command,
          cwd: relativeCwd,
          exitCode: result.exitCode,
          durationMs,
          stdout: result.stdout,
          stderr: result.stderr,
        };
      } catch (error) {
        logger.error('command failed', error);
        throw error;
      }
    },
  });
}
