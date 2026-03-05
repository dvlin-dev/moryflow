/**
 * [PROPS]: MessageToolProps - ToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: Admin chat Tool 片段渲染（与 PC/Console 同语义）
 * [UPDATE]: 2026-03-05 - Tool Header 接入共享命令摘要（scriptType + command），对齐 Bash Card 两行头
 * [UPDATE]: 2026-03-05 - 新增 ToolSummary 外层摘要标题并接入 toolSummary* i18n fallback 模板
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
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
import { useTranslation } from '@/lib/i18n';

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const { t } = useTranslation('chat');
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const toolState = part.state as ToolState;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const statusLabels = useMemo(
    () => ({
      'input-streaming': t('statusPreparing'),
      'input-available': t('statusExecuting'),
      'approval-requested': t('statusWaitingConfirmation'),
      'approval-responded': t('statusConfirmed'),
      'output-available': t('statusCompleted'),
      'output-error': t('statusError'),
      'output-denied': t('statusSkipped'),
    }),
    [t]
  );
  const outputLabels = useMemo(
    () => ({
      result: t('resultLabel'),
      error: t('errorLabel'),
      command: t('commandLabel'),
      cwd: t('cwdLabel'),
      exit: t('exitLabel'),
      duration: t('durationLabel'),
      stdout: t('stdoutLabel'),
      stderr: t('stderrLabel'),
      targetFile: t('targetFile'),
      contentTooLong: t('contentTooLong'),
      outputTruncated: t('outputTruncated'),
      fullOutputPath: t('fullOutputPath'),
      applyToFile: t('applyToFile'),
      noTasks: t('noTasks'),
      tasksCompleted: (completed: number, total: number) =>
        t('tasksCompleted', { completed, total }),
    }),
    [t]
  );
  const summaryLabels = useMemo(
    () => ({
      running: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummaryRunning', { tool, command }),
      success: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummarySuccess', { tool, command }),
      error: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummaryError', { tool, command }),
      skipped: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummarySkipped', { tool, command }),
    }),
    [t]
  );
  const toolSummary = resolveToolOuterSummary({
    type: toolType,
    state: toolState,
    input: (part.input as Record<string, unknown> | undefined) ?? undefined,
    output: part.output,
    labels: summaryLabels,
  });
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: toolState,
          hasManualExpanded: userOpenPreference === true,
        });

  return (
    <Tool open={isOpen} onOpenChange={setUserOpenPreference} disabled={!hasOutput}>
      <ToolSummary summary={toolSummary.outerSummary} />
      {hasOutput ? (
        <ToolContent state={toolState} statusLabels={statusLabels}>
          <ToolHeader
            type={toolType}
            state={toolState}
            input={part.input as Record<string, unknown>}
            statusLabels={statusLabels}
            scriptType={toolSummary.scriptType}
            command={toolSummary.command}
          />
          <ToolOutput output={part.output} errorText={part.errorText} labels={outputLabels} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
