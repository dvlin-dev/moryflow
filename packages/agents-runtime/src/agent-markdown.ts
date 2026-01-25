/**
 * [PROVIDES]: Agent Markdown 解析（JSONC frontmatter + prompt body）
 * [DEPENDS]: agents-runtime/jsonc, agents-runtime/hooks
 * [POS]: 用户级 Agent 外部化支持
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { parseJsonc } from './jsonc';
import { sanitizeModelSettings } from './hooks';
import type { ModelSettings } from '@openai/agents-core';

export type AgentMarkdownDefinition = {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  modelSettings?: Partial<ModelSettings>;
  sourcePath?: string;
};

export type AgentMarkdownParseResult = {
  agent?: AgentMarkdownDefinition;
  errors: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const getFileStem = (filePath?: string): string => {
  if (!filePath) return 'agent';
  const normalized = filePath.replace(/\\/g, '/');
  const base = normalized.split('/').pop() ?? normalized;
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0) return base || 'agent';
  return base.slice(0, dotIndex) || 'agent';
};

const stripFrontmatter = (content: string): { frontmatter?: string; body: string } => {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return { body: content };
  }
  const endIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (endIndex === -1) {
    return { body: content };
  }
  const frontmatterLines = lines.slice(1, endIndex + 1);
  const bodyLines = lines.slice(endIndex + 2);
  return { frontmatter: frontmatterLines.join('\n'), body: bodyLines.join('\n') };
};

export const parseAgentMarkdown = (input: {
  content: string;
  filePath?: string;
}): AgentMarkdownParseResult => {
  const { content, filePath } = input;
  const { frontmatter, body } = stripFrontmatter(content);
  const errors: string[] = [];
  let metadata: Record<string, unknown> | null = null;

  if (frontmatter) {
    const parsed = parseJsonc(frontmatter);
    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors.map((err) => `frontmatter:${err}`));
    }
    metadata = isRecord(parsed.data) ? parsed.data : null;
  }

  const fileBase = getFileStem(filePath);
  const id = getString(metadata?.id) ?? fileBase;
  const name = getString(metadata?.name) ?? id;
  const description = getString(metadata?.description);
  const systemPrompt = getString(metadata?.systemPrompt) ?? body.trim();

  if (!systemPrompt) {
    errors.push('missing_system_prompt');
  }

  const modelSettings = sanitizeModelSettings(metadata?.modelSettings);

  if (!systemPrompt) {
    return { errors };
  }

  return {
    agent: {
      id,
      name,
      description,
      systemPrompt,
      modelSettings: modelSettings ?? undefined,
      sourcePath: filePath,
    },
    errors,
  };
};
