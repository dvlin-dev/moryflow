import { Badge } from '@aiget/ui/components/badge'

type McpToolListProps = {
  toolNames?: string[]
  toolCount?: number
}

export const McpToolList = ({ toolNames, toolCount }: McpToolListProps) => {
  if (!toolNames || toolNames.length === 0) {
    if (toolCount !== undefined && toolCount > 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">工具列表 ({toolCount} 个)</p>
          <p className="text-xs text-muted-foreground">工具名称未获取，重新验证试试</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">工具列表 ({toolNames.length} 个)</p>
      <div className="flex flex-wrap gap-2">
        {toolNames.map((name) => (
          <Badge key={name} variant="secondary" className="font-mono text-xs">
            {name}
          </Badge>
        ))}
      </div>
    </div>
  )
}
