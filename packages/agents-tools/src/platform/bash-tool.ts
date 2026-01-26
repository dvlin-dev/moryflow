/**
 * [PROVIDES]: createBashTool - 非沙盒化的 bash 工具
 * [DEPENDS]: @openai/agents-core, @anyhunt/agents-adapter, @anyhunt/agents-runtime
 * [POS]: 基础 bash 工具实现（输出交由 runtime 统一截断）
 *
 * [NOTE]: 当前未被任何平台调用：
 *   - PC 端使用 /agents-sandbox 的沙盒化版本
 *   - Mobile 端不支持 bash
 *   保留此文件作为非沙盒版本的备选实现
 */
import { tool, type RunContext } from '@openai/agents-core';
import { z } from 'zod';
import type { PlatformCapabilities } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import { toolSummarySchema } from '../shared';

const DEFAULT_TIMEOUT = 120_000; // 2 分钟
const MAX_TIMEOUT = 600_000; // 10 分钟

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

/**
 * 创建 bash 命令执行工具
 * 仅在桌面端可用
 */
export const createBashTool = (capabilities: PlatformCapabilities, vaultUtils?: VaultUtils) => {
  const { optional, logger, path: pathUtils } = capabilities;

  if (!optional?.executeShell) {
    throw new Error('bash 工具需要 executeShell 能力');
  }

  const executeShell = optional.executeShell;

  return tool({
    name: 'bash',
    description:
      '在 Vault 目录下执行 shell 命令。可用于运行脚本、文档转换、Git 操作等。危险命令（如 rm -rf）请谨慎使用。',
    parameters: bashParams,
    async execute({ command, cwd, timeout }, runContext?: RunContext<AgentContext>) {
      console.log('[tool] bash', { command, cwd, timeout });

      const vaultRoot = runContext?.context?.vaultRoot;
      if (!vaultRoot) {
        throw new Error('无法确定工作目录');
      }

      // 确定工作目录
      let workDir: string;
      let relativeCwd: string;

      if (cwd && vaultUtils) {
        const resolved = await vaultUtils.resolvePath(cwd);
        workDir = resolved.absolute;
        relativeCwd = resolved.relative;
      } else if (cwd) {
        workDir = pathUtils.resolve(vaultRoot, cwd);
        relativeCwd = cwd;
      } else {
        workDir = vaultRoot;
        relativeCwd = '.';
      }

      // 安全检查：确保在 Vault 内
      const relative = pathUtils.relative(vaultRoot, workDir);
      const isInsideVault =
        relative === '' || (!relative.startsWith('..') && !pathUtils.isAbsolute(relative));
      if (!isInsideVault) {
        throw new Error('工作目录必须在 Vault 内');
      }

      const startedAt = Date.now();

      try {
        const result = await executeShell(command, workDir, timeout);
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
        logger.error('[bash] Command failed:', error);
        throw error;
      }
    },
  });
};
