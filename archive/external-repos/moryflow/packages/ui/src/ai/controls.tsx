"use client";

import { cn } from "../lib/utils";
import { Controls as ControlsPrimitive } from "@xyflow/react";
import type { ComponentProps } from "react";

export type ControlsProps = ComponentProps<typeof ControlsPrimitive>;

export const Controls = ({ className, ...props }: ControlsProps) => (
  <ControlsPrimitive
    className={cn(
      "gap-px overflow-hidden rounded-lg border border-border-muted bg-card p-1 shadow-none!",
      "[&>button]:rounded-lg [&>button]:border-none! [&>button]:bg-transparent! [&>button]:transition-colors [&>button]:duration-fast hover:[&>button]:bg-secondary!",
      className
    )}
    {...props}
  />
);
