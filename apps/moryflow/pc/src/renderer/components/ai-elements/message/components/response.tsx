"use client";

import { memo } from "react";

import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

import type { MessageResponseProps } from "@aiget/ui/ai/message";

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";
