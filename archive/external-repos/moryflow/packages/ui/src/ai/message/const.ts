"use client";

import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import type { FileUIPart, UIMessage } from "ai";
import { Button } from "../../components/button";
import { Streamdown } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageActionsProps = ComponentProps<"div">;

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export type MessageBranchContextType = {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageBranchSelectorProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export type MessageAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  className?: string;
  onRemove?: () => void;
};

export type MessageAttachmentsProps = ComponentProps<"div">;

export type MessageToolbarProps = ComponentProps<"div">;
