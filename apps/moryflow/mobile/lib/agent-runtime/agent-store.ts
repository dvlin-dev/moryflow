/**
 * [PROVIDES]: Mobile Agent Markdown 读取
 * [DEPENDS]: expo-file-system, agents-runtime/agent-markdown
 * [POS]: Mobile Agent 外部化入口（Paths.document/.moryflow/agents/*.md）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Directory, File, Paths } from 'expo-file-system';
import { parseAgentMarkdown, type AgentMarkdownDefinition } from '@moryflow/agents-runtime';

const AGENTS_DIR = Paths.join(Paths.document.uri, '.moryflow', 'agents');

const isMarkdownFile = (name: string): boolean => name.toLowerCase().endsWith('.md');

const getFileName = (uri: string): string => {
  const normalized = uri.replace(/\\/g, '/');
  return normalized.split('/').pop() ?? uri;
};

export const loadAgentDefinitions = async (): Promise<AgentMarkdownDefinition[]> => {
  try {
    const dir = new Directory(AGENTS_DIR);
    if (!dir.exists) return [];
    const entries = dir.list();
    const files = entries.filter((entry) => entry instanceof File) as File[];
    if (files.length === 0) return [];

    const definitions: AgentMarkdownDefinition[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const name = getFileName(file.uri);
      if (!isMarkdownFile(name)) continue;
      const content = await file.text();
      const result = parseAgentMarkdown({ content, filePath: file.uri });
      if (result.errors.length > 0) {
        console.warn('[agent-store] parse errors:', name, result.errors.join(', '));
      }
      if (!result.agent) continue;
      if (seen.has(result.agent.id)) {
        console.warn('[agent-store] duplicate agent id, last wins:', result.agent.id);
        const index = definitions.findIndex((item) => item.id === result.agent.id);
        if (index >= 0) {
          definitions.splice(index, 1);
        }
      } else {
        seen.add(result.agent.id);
      }
      definitions.push(result.agent);
    }

    return definitions;
  } catch (error) {
    console.warn('[agent-store] failed to load agents', error);
    return [];
  }
};

export const findAgentById = (
  agents: AgentMarkdownDefinition[],
  agentId?: string
): AgentMarkdownDefinition | null => {
  if (!agentId) return null;
  return agents.find((agent) => agent.id === agentId) ?? null;
};
