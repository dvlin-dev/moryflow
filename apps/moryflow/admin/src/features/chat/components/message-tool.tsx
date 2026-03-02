/**
 * [PROPS]: MessageToolProps - ToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: Admin chat Tool 片段渲染（与 PC/Console 同语义）
 */

import { useMemo, useState } from 'react';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { Tool, ToolContent, ToolHeader, ToolOutput, type ToolState } from '@moryflow/ui/ai/tool';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
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
      viewFullOutput: t('viewFullOutput'),
      fullOutputPath: t('fullOutputPath'),
      applyToFile: t('applyToFile'),
      noTasks: t('noTasks'),
      tasksCompleted: (completed: number, total: number) =>
        t('tasksCompleted', { completed, total }),
    }),
    [t]
  );
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: toolState,
          hasManualExpanded: userOpenPreference === true,
        });

  return (
    <Tool
      className="mb-3 w-full border-0 bg-transparent p-0"
      open={isOpen}
      onOpenChange={setUserOpenPreference}
      disabled={!hasOutput}
    >
      <ToolHeader
        type={toolType}
        state={toolState}
        input={part.input as Record<string, unknown>}
        statusLabels={statusLabels}
      />
      {hasOutput ? (
        <ToolContent className="pt-2">
          <ToolOutput output={part.output} errorText={part.errorText} labels={outputLabels} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
