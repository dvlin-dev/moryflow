import { tool, type RunContext } from '@openai/agents-core';
import { createTwoFilesPatch } from 'diff';
import { z } from 'zod';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';
import { toolSummarySchema, trimPreview } from '../shared';

const editParams = z.object({
  summary: toolSummarySchema.default('edit'),
  path: z.string().min(1).describe('File path relative to Vault root'),
  old_text: z.string().min(1).describe('Original text to replace'),
  new_text: z.string().describe('Replacement text'),
  occurrence: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Which occurrence to replace (default: first)'),
});

/**
 * 创建编辑文件工具
 */
export const createEditTool = (
  capabilities: PlatformCapabilities,
  crypto: CryptoUtils,
  vaultUtils: VaultUtils
) => {
  const { fs } = capabilities;

  return tool({
    name: 'edit',
    description: `Edit a file by finding and replacing text. Writes directly and returns a diff. Read the file first to confirm content before editing.`,
    parameters: editParams,
    async execute(
      { path: targetPath, old_text: oldText, new_text: newText, occurrence },
      runContext?: RunContext<AgentContext>
    ) {
      console.log('[tool] edit', { path: targetPath, occurrence });

      const data = await vaultUtils.readFile(targetPath, runContext);

      // 查找第 N 次出现
      let searchIndex = 0;
      let foundIndex = -1;
      for (let count = 0; count < occurrence; count += 1) {
        foundIndex = data.content.indexOf(oldText, searchIndex);
        if (foundIndex === -1) {
          throw new Error(
            `Occurrence #${occurrence} of old_text not found — read the file first to verify`
          );
        }
        searchIndex = foundIndex + oldText.length;
      }

      const before = data.content.slice(0, foundIndex);
      const after = data.content.slice(foundIndex + oldText.length);
      const updatedContent = `${before}${newText}${after}`;

      // 直接写入文件
      await fs.writeFile(data.absolute, updatedContent);

      // 重新读取文件内容计算 sha256，确保与 read 工具一致
      // 因为某些文件系统（如 expo-file-system）的 text() 方法会去掉末尾换行符
      const actualContent = await fs.readFile(data.absolute);

      const patch = createTwoFilesPatch(data.relative, data.relative, data.content, actualContent);
      const preview = trimPreview(actualContent);
      const newSha256 = await crypto.sha256(actualContent);

      return {
        path: data.relative,
        sha256: newSha256,
        diff: patch,
        newSize: new TextEncoder().encode(actualContent).length,
        preview: preview.text,
        truncated: preview.truncated,
      };
    },
  });
};
