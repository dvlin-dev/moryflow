/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 * [UPDATE]: 2026-03-02 - 移除 effect 内同步 setState，改为派生开合状态以满足 react-hooks/set-state-in-effect
 * [UPDATE]: 2026-03-02 - Tool 状态迁移策略改为复用 @moryflow/agents-runtime 共享事实源
 * [UPDATE]: 2026-03-02 - 对齐 Moryflow Tool 交互：运行态默认展开、完成后自动折叠，移除 Parameters 输入区
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { Tool, ToolContent, ToolHeader, ToolOutput, type ToolState } from '@moryflow/ui/ai/tool';
import { isToolInProgressState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const toolState = part.state as ToolState;
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const inProgress = isToolInProgressState(toolState);
  const isOpen = inProgress ? true : userOpenPreference === true;

  const handleOpenChange = (nextOpen: boolean) => {
    setUserOpenPreference(nextOpen);
  };

  return (
    <Tool
      className="mb-3 w-full border-0 bg-transparent p-0"
      open={isOpen}
      onOpenChange={handleOpenChange}
      disabled={!hasOutput}
    >
      <ToolHeader
        type={toolType}
        state={toolState}
        input={part.input as Record<string, unknown> | undefined}
        className="px-0 py-0.5"
      />
      {hasOutput ? (
        <ToolContent className="pt-2">
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
