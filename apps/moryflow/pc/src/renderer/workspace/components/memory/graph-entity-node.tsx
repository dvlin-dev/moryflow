import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

type EntityNodeData = {
  label: string;
  entityType: string;
  color: string;
  onEntityClick?: (entityId: string) => void;
};

const EntityNodeComponent = ({ id, data }: NodeProps) => {
  const { label, entityType, color, onEntityClick } = data as EntityNodeData;

  return (
    <button
      type="button"
      onClick={() => onEntityClick?.(id)}
      className="rounded-xl border border-border-muted bg-card px-3 py-1.5 shadow-xs transition-colors hover:border-foreground/20 hover:shadow-sm"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
      <div className="flex items-center gap-2">
        <div className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">{entityType}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
    </button>
  );
};

export const EntityNode = memo(EntityNodeComponent);
