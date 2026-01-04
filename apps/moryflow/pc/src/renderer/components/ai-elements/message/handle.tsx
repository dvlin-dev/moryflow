"use client";

import {
  createContext,
  useContext,
} from "react";

import type { MessageBranchContextType } from "@aiget/ui/ai/message";

export const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

export const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};
