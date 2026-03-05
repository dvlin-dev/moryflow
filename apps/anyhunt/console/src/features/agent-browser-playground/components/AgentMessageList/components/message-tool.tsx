/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 * [UPDATE]: 2026-03-02 - 移除 effect 内同步 setState，改为派生开合状态以满足 react-hooks/set-state-in-effect
 * [UPDATE]: 2026-03-02 - Tool 状态迁移策略改为复用 @moryflow/agents-runtime 共享事实源
 * [UPDATE]: 2026-03-02 - 对齐 Moryflow Tool 交互：运行态默认展开、完成后自动折叠，移除 Parameters 输入区
 * [UPDATE]: 2026-03-05 - Tool Header 接入共享命令摘要（scriptType + command），对齐 Bash Card 两行头
 * [UPDATE]: 2026-03-05 - 新增 ToolSummary 外层摘要标题（优先 input.summary，缺失时按状态+命令 fallback）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  ToolSummary,
  type ToolState,
} from '@moryflow/ui/ai/tool';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveToolOuterSummary } from '@moryflow/agents-runtime/ui-message/tool-command-summary';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const toolState = part.state as ToolState;
  const toolSummary = resolveToolOuterSummary({
    type: toolType,
    state: toolState,
    input: (part.input as Record<string, unknown> | undefined) ?? undefined,
    output: part.output,
  });
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: toolState,
          hasManualExpanded: userOpenPreference === true,
        });

  const handleOpenChange = (nextOpen: boolean) => {
    setUserOpenPreference(nextOpen);
  };

  return (
    <Tool open={isOpen} onOpenChange={handleOpenChange} disabled={!hasOutput}>
      <ToolSummary summary={toolSummary.outerSummary} />
      {hasOutput ? (
        <ToolContent>
          <ToolHeader
            type={toolType}
            state={toolState}
            input={part.input as Record<string, unknown> | undefined}
            scriptType={toolSummary.scriptType}
            command={toolSummary.command}
          />
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
