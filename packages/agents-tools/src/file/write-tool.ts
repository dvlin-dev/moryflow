/**
 * [PROVIDES]: createWriteTool, applyWriteOperation - 文件写入与 patch 写入工具
 * [DEPENDS]: @openai/agents-core, zod, diff, agents-runtime VaultUtils
 * [POS]: Agent 文件写入工具，实现 write 工具与 IPC 写入逻辑
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { tool, type RunContext } from '@openai/agents-core';
import { applyPatch } from 'diff';
import { z } from 'zod';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema, trimPreview } from '../shared';

/**
 * 用于前端 IPC 调用的写操作 schema（支持 patch 模式）
 */
export const writeOperationSchema = z.object({
  path: z.string().min(1),
  baseSha: z.string().length(64, 'baseSha must be a sha256 hash'),
  patch: z.string().optional(),
  content: z.string().optional(),
  mode: z.enum(['patch', 'replace']).default('patch'),
});

export type WriteOperationInput = z.infer<typeof writeOperationSchema>;

/**
 * 应用写操作的核心逻辑
 */
export interface ApplyWriteOperationDeps {
  vaultUtils: VaultUtils;
  fs: PlatformCapabilities['fs'];
  crypto: CryptoUtils;
}

/**
 * 应用写操作（供前端 IPC 使用）
 */
export const applyWriteOperation = async (
  input: WriteOperationInput,
  deps: ApplyWriteOperationDeps
) => {
  const { path: targetPath, baseSha, patch, content, mode } = input;
  const { vaultUtils, fs, crypto } = deps;

  const data = await vaultUtils.readFile(targetPath);

  if (data.sha256 !== baseSha) {
    throw new Error('File has been modified — re-read the latest content before writing');
  }

  let updatedContent: string | false;
  if (mode === 'replace') {
    if (typeof content !== 'string') {
      throw new Error('content is required when mode is replace');
    }
    updatedContent = content;
  } else {
    if (!patch || patch.length === 0) {
      throw new Error('patch is required when mode is patch');
    }
    updatedContent = applyPatch(data.content, patch);
    if (updatedContent === false) {
      throw new Error('Failed to apply patch — verify the diff content');
    }
  }

  await fs.writeFile(data.absolute, updatedContent);

  // 重新读取文件内容计算 sha256，确保与 read 工具一致
  const actualContent = await fs.readFile(data.absolute);
  const updatedSha = await crypto.sha256(actualContent);
  const preview = trimPreview(actualContent);

  return {
    path: data.relative,
    sha256: updatedSha,
    size: new TextEncoder().encode(actualContent).length,
    preview: preview.text,
    truncated: preview.truncated,
  };
};

const writeParams = z.object({
  summary: toolSummarySchema.default('write'),
  path: z.string().min(1).describe('File path relative to Vault root'),
  content: z.string().describe('Full content to write'),
  base_sha: z
    .string()
    .length(64)
    .optional()
    .describe('Required when overwriting an existing file — the sha256 from read'),
  create_directories: z.boolean().default(false).describe('Auto-create parent directories'),
});

/**
 * 创建写入文件工具
 */
export const createWriteTool = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  vaultUtils: VaultUtils
) => {
  const { fs, path: pathUtils } = capabilities;

  return tool({
    name: 'write',
    description: `Create a new file or overwrite an existing one. No base_sha needed for new files; overwriting requires base_sha (from read) to prevent accidental overwrites.`,
    parameters: writeParams,
    async execute(
      { path: targetPath, content, base_sha: baseSha, create_directories: createDirectories },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] write', {
        path: targetPath,
        hasBaseSha: Boolean(baseSha),
        createDirectories,
      });

      let isNewFile = false;
      let absolutePath: string;
      let relativePath: string;

      try {
        const data = await vaultUtils.readFile(targetPath, runContext);
        absolutePath = data.absolute;
        relativePath = data.relative;

        // 文件存在，必须校验 base_sha
        if (!baseSha) {
          throw new Error('base_sha is required to overwrite an existing file — call read first');
        }
        if (data.sha256 !== baseSha) {
          throw new Error(
            'File has been modified (sha256 mismatch) — re-read to get the latest content'
          );
        }
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'ENOENT') {
          // 文件不存在，可以新建
          isNewFile = true;
          const resolved = await vaultUtils.resolvePath(targetPath, runContext);
          absolutePath = resolved.absolute;
          relativePath = resolved.relative;
        } else {
          throw err;
        }
      }

      // 自动创建父目录
      if (createDirectories) {
        const dir = pathUtils.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(absolutePath, content);

      // 重新读取文件内容计算 sha256，确保与 read 工具一致
      // 因为某些文件系统（如 expo-file-system）的 text() 方法会去掉末尾换行符
      const actualContent = await fs.readFile(absolutePath);
      const sha256 = await crypto.sha256(actualContent);
      const preview = trimPreview(actualContent);

      return {
        path: relativePath,
        sha256,
        size: new TextEncoder().encode(actualContent).length,
        created: isNewFile,
        preview: preview.text,
        truncated: preview.truncated,
      };
    },
  });
};
