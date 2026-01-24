/**
 * [PROPS]: McpToolListProps - MCP 工具名称与数量
 * [EMITS]: none
 * [POS]: MCP 详情页工具列表展示
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Badge } from '@anyhunt/ui/components/badge';

type McpToolListProps = {
  toolNames?: string[];
  toolCount?: number;
};

export const McpToolList = ({ toolNames, toolCount }: McpToolListProps) => {
  if (!toolNames || toolNames.length === 0) {
    if (toolCount !== undefined && toolCount > 0) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">Tools ({toolCount})</p>
          <p className="text-xs text-muted-foreground">
            Tool names are unavailable. Try verifying again.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Tools ({toolNames.length})</p>
      <div className="flex flex-wrap gap-2">
        {toolNames.map((name) => (
          <Badge key={name} variant="secondary" className="font-mono text-xs">
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
};
