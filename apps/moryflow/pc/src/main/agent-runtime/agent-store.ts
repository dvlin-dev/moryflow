/**
 * [PROVIDES]: Desktop Agent Markdown 读取（重复 ID 安全合并）
 * [DEPENDS]: node:fs, node:path, agents-runtime/agent-markdown
 * [POS]: PC Agent 外部化入口（~/.moryflow/agents/*.md）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseAgentMarkdown, type AgentMarkdownDefinition } from '@moryflow/agents-runtime';

const AGENTS_DIR = path.join(os.homedir(), '.moryflow', 'agents');

const isMarkdownFile = (fileName: string): boolean => fileName.toLowerCase().endsWith('.md');

export const loadAgentDefinitions = async (): Promise<AgentMarkdownDefinition[]> => {
  try {
    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && isMarkdownFile(entry.name));
    if (files.length === 0) return [];

    const definitions: AgentMarkdownDefinition[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const fullPath = path.join(AGENTS_DIR, file.name);
      const content = await fs.readFile(fullPath, 'utf-8');
      const result = parseAgentMarkdown({ content, filePath: fullPath });
      if (result.errors.length > 0) {
        console.warn('[agent-store] parse errors:', file.name, result.errors.join(', '));
      }
      const agent = result.agent;
      if (!agent) continue;
      if (seen.has(agent.id)) {
        console.warn('[agent-store] duplicate agent id, last wins:', agent.id);
        const index = definitions.findIndex((item) => item.id === agent.id);
        if (index >= 0) {
          definitions.splice(index, 1);
        }
      } else {
        seen.add(agent.id);
      }
      definitions.push(agent);
    }

    return definitions;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
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

export const loadAgentDefinitionsSync = (): AgentMarkdownDefinition[] => {
  try {
    const entries = readdirSync(AGENTS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && isMarkdownFile(entry.name));
    if (files.length === 0) return [];

    const definitions: AgentMarkdownDefinition[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const fullPath = path.join(AGENTS_DIR, file.name);
      const content = readFileSync(fullPath, 'utf-8');
      const result = parseAgentMarkdown({ content, filePath: fullPath });
      if (result.errors.length > 0) {
        console.warn('[agent-store] parse errors:', file.name, result.errors.join(', '));
      }
      const agent = result.agent;
      if (!agent) continue;
      if (seen.has(agent.id)) {
        console.warn('[agent-store] duplicate agent id, last wins:', agent.id);
        const index = definitions.findIndex((item) => item.id === agent.id);
        if (index >= 0) {
          definitions.splice(index, 1);
        }
      } else {
        seen.add(agent.id);
      }
      definitions.push(agent);
    }

    return definitions;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    console.warn('[agent-store] failed to load agents', error);
    return [];
  }
};
