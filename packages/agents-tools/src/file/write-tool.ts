import { tool, type RunContext } from '@openai/agents-core';
import { applyPatch } from 'diff';
import { z } from 'zod';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';
import { toolSummarySchema, trimPreview } from '../shared';

/**
 * 用于前端 IPC 调用的写操作 schema（支持 patch 模式）
 */
export const writeOperationSchema = z.object({
  path: z.string().min(1),
  baseSha: z.string().length(64, 'baseSha 必须是 sha256'),
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
    throw new Error('文件已被修改，请重新读取最新内容后再尝试写入');
  }

  let updatedContent: string | false;
  if (mode === 'replace') {
    if (typeof content !== 'string') {
      throw new Error('mode 为 replace 时必须提供 content');
    }
    updatedContent = content;
  } else {
    if (!patch || patch.length === 0) {
      throw new Error('mode 为 patch 时必须提供 patch');
    }
    updatedContent = applyPatch(data.content, patch);
    if (updatedContent === false) {
      throw new Error('无法应用 patch，请检查 diff 内容');
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
  path: z.string().min(1),
  content: z.string().describe('要写入的完整内容'),
  base_sha: z
    .string()
    .optional()
    .transform((v) => (v && v.length === 64 ? v : undefined))
    .describe('覆盖已有文件时必须提供，来自 read 返回的 sha256'),
  create_directories: z.boolean().default(false).describe('是否自动创建父目录'),
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
    description:
      '创建新文件或覆盖已有文件。新建文件无需 base_sha；覆盖已有文件必须提供 base_sha（来自 read 返回值），防止意外覆盖。',
    parameters: writeParams,
    async execute(
      { path: targetPath, content, base_sha: baseSha, create_directories: createDirectories },
      _runContext?: RunContext<AgentContext>
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
        const data = await vaultUtils.readFile(targetPath);
        absolutePath = data.absolute;
        relativePath = data.relative;

        // 文件存在，必须校验 base_sha
        if (!baseSha) {
          throw new Error('覆盖已有文件必须提供 base_sha，请先调用 read 获取');
        }
        if (data.sha256 !== baseSha) {
          throw new Error('文件已被修改（sha256 不匹配），请重新 read 获取最新内容');
        }
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'ENOENT') {
          // 文件不存在，可以新建
          isNewFile = true;
          const resolved = await vaultUtils.resolvePath(targetPath);
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
