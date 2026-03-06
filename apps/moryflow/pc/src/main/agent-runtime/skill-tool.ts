/**
 * [PROVIDES]: createSkillTool - 按名称加载已启用技能正文（白名单）
 * [DEPENDS]: @openai/agents-core, zod, main/skills
 * [POS]: PC Agent Runtime 的 Skills 工具入口
 * [UPDATE]: 2026-02-11 - 精简输入 schema：移除未使用的 summary 参数，避免无效字段干扰
 * [UPDATE]: 2026-02-11 - XML 转义补齐属性场景（双引号/单引号），避免 tool 输出标签被输入污染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';
import { getSkillsRegistry } from '../skills/index.js';

const skillInputSchema = z.object({
  name: z.string().min(1).describe('The skill name (kebab-case) to load.'),
});

const xmlEscape = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export const createSkillTool = () =>
  tool<typeof skillInputSchema, AgentContext>({
    name: 'skill',
    description:
      'Load one enabled skill by name and return full skill content plus local file references.',
    parameters: skillInputSchema,
    execute: async ({ name }) => {
      const registry = getSkillsRegistry();
      const detail = await registry.loadSkillForTool(name);
      if (!detail) {
        return [
          '<skill_error>',
          '<message>Skill not found or disabled.</message>',
          `<name>${xmlEscape(name)}</name>`,
          '</skill_error>',
        ].join('\n');
      }

      const files = detail.files.map((file) => `<file>${xmlEscape(file)}</file>`).join('');
      return [
        `<skill_content name="${xmlEscape(detail.name)}">`,
        detail.content,
        '</skill_content>',
        '<skill_meta>',
        `<name>${xmlEscape(detail.name)}</name>`,
        `<base_dir>${xmlEscape(detail.location)}</base_dir>`,
        '</skill_meta>',
        `<skill_files>${files}</skill_files>`,
      ].join('\n');
    },
  });
