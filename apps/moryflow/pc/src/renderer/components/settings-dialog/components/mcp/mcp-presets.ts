/**
 * [DEFINES]: McpPreset / MCP_PRESETS - MCP 预设配置
 * [USED_BY]: settings-dialog MCP 模块
 * [POS]: MCP 预设清单
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
