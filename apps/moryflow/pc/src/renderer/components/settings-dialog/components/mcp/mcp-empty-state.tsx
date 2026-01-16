import { Button } from '@anyhunt/ui/components/button'
import { Badge } from '@anyhunt/ui/components/badge'
import { PlusIcon } from 'lucide-react'
import { MCP_PRESETS, type McpPreset } from './mcp-presets'

type McpEmptyStateProps = {
  onAdd: () => void
  onAddPreset: (preset: McpPreset) => void
}

export const McpEmptyState = ({ onAdd, onAddPreset }: McpEmptyStateProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
    <div className="space-y-2">
      <p className="text-lg font-medium">还没有 MCP</p>
      <p className="text-sm text-muted-foreground">
        MCP 让 AI 能调用外部工具，比如搜索、抓取网页。
      </p>
    </div>

    <Button type="button" onClick={onAdd}>
      <PlusIcon className="mr-2 size-4" />
      添加服务器
    </Button>

    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">或从预设添加：</p>
      <div className="flex flex-wrap justify-center gap-2">
        {MCP_PRESETS.map((preset) => (
          <Badge
            key={preset.id}
            variant="outline"
            className="cursor-pointer px-3 py-1.5 transition-colors hover:bg-muted"
            onClick={() => onAddPreset(preset)}
          >
            {preset.name}
            {preset.envRequired && preset.envRequired.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">*</span>
            )}
          </Badge>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">* 需要配置环境变量</p>
    </div>
  </div>
)
