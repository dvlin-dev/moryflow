/**
 * [PROPS]: ChatPromptInputMcpSelectorProps - MCP 独立入口按钮与下拉面板
 * [EMITS]: onOpenSettings - 打开设置中的 MCP 分区
 * [POS]: Chat Prompt 输入框 MCP 入口（位于访问模式按钮后）
 * [UPDATE]: 2026-03-02 - MCP 从 + 二级菜单迁出，改为与权限按钮一致的独立 icon 下拉
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { Plug } from 'lucide-react';
import { PromptInputButton } from '@moryflow/ui/ai/prompt-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu';
import type { SettingsSection } from '@/components/settings-dialog/const';
import { McpPanel } from './mcp-panel';

export type ChatPromptInputMcpSelectorProps = {
  disabled?: boolean;
  onOpenSettings?: (section?: SettingsSection) => void;
  label: string;
};

const TOOL_ICON_BUTTON_CLASS = 'size-7 rounded-sm p-0';
const TOOL_ICON_SIZE = 17;
const TOOL_ICON_STROKE_WIDTH = 1.85;

export const ChatPromptInputMcpSelector = ({
  disabled,
  onOpenSettings,
  label,
}: ChatPromptInputMcpSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <PromptInputButton
          aria-label={label}
          disabled={disabled}
          className={TOOL_ICON_BUTTON_CLASS}
        >
          <Plug aria-hidden size={TOOL_ICON_SIZE} strokeWidth={TOOL_ICON_STROKE_WIDTH} />
        </PromptInputButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-56 p-0">
        <McpPanel
          disabled={disabled}
          onOpenSettings={onOpenSettings}
          onClose={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
