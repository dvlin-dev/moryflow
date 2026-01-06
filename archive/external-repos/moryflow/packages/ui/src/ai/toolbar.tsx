import { cn } from "../lib/utils";
import { NodeToolbar, Position } from "@xyflow/react";
import type { ComponentProps } from "react";

type ToolbarProps = ComponentProps<typeof NodeToolbar>;

export const Toolbar = ({ className, ...props }: ToolbarProps) => (
  <NodeToolbar
    className={cn(
      "flex items-center gap-1 rounded-md border border-border-muted bg-background p-1.5 shadow-xs",
      className
    )}
    position={Position.Bottom}
    {...props}
  />
);
