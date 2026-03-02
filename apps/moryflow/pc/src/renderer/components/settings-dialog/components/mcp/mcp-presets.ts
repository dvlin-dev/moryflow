/**
 * [DEFINES]: McpPreset / MCP_PRESETS - MCP 预设配置
 * [USED_BY]: settings-dialog MCP 模块
 * [POS]: MCP 预设清单
 * [UPDATE]: 2026-03-02 - MCP 预设改为受管 package 模型（packageName/binName），新增 macOS Kit 默认 bin
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type McpPreset = {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'http';
  packageName?: string;
  binName?: string;
  args?: string[];
  url?: string;
  envRequired?: string[];
};

export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'macos-kit',
    name: 'macOS Kit',
    description: 'macOS automation with AppleScript/JXA',
    type: 'stdio',
    packageName: '@moryflow/macos-kit',
    binName: 'macos-kit-mcp',
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Fetches latest library docs',
    type: 'stdio',
    packageName: '@anthropic-ai/context7-mcp',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation',
    type: 'stdio',
    packageName: '@anthropic-ai/playwright-mcp',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web crawling and data extraction',
    type: 'stdio',
    packageName: 'firecrawl-mcp',
    envRequired: ['FIRECRAWL_API_KEY'],
  },
];
