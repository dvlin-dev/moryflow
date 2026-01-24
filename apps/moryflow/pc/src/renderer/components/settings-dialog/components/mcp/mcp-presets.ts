/**
 * [DEFINES]: McpPreset / MCP_PRESETS - MCP 预设配置
 * [USED_BY]: settings-dialog MCP 模块
 * [POS]: MCP 预设清单
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type McpPreset = {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  envRequired?: string[];
};

export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'Fetches web content',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/fetch-mcp'],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Searches the web using Brave',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/brave-search-mcp'],
    envRequired: ['BRAVE_API_KEY'],
  },
  {
    id: 'context7',
    name: 'Context7',
    description: 'Fetches latest library docs',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/context7-mcp'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Browser automation',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/playwright-mcp'],
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web crawling and data extraction',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    envRequired: ['FIRECRAWL_API_KEY'],
  },
];
