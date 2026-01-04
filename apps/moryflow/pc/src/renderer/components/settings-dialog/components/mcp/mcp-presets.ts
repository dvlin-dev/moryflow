export type McpPreset = {
  id: string
  name: string
  description: string
  type: 'stdio' | 'http'
  command?: string
  args?: string[]
  url?: string
  envRequired?: string[]
}

export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'fetch',
    name: 'Fetch',
    description: '抓取网页内容',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/fetch-mcp'],
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: '使用 Brave 搜索引擎',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/brave-search-mcp'],
    envRequired: ['BRAVE_API_KEY'],
  },
  {
    id: 'context7',
    name: 'Context7',
    description: '获取最新的库文档',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/context7-mcp'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: '浏览器自动化测试',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic-ai/playwright-mcp'],
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: '网页爬取和数据提取',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    envRequired: ['FIRECRAWL_API_KEY'],
  },
]
