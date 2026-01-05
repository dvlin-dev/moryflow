export const MCP_PANEL_HEIGHT = '100%'
export const MCP_PANEL_MAX_HEIGHT = 'none'

export type McpServerType = 'stdio' | 'http'

/** 统一的 MCP 服务器列表项 */
export type McpServerEntry = {
  type: McpServerType
  index: number
  id: string
  name: string
  enabled: boolean
}
