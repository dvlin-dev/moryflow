/**
 * [PROPS]: ToolPartProps - 工具消息片段渲染参数
 * [EMITS]: onToolApproval/onApplyDiff
 * [POS]: ChatMessage 工具片段（审批 + 输出）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useState } from 'react';
import type { ToolUIPart } from 'ai';
import type { ToolState } from '@moryflow/ui/ai/tool';
import { Tool, ToolContent, ToolHeader, ToolOutput, ToolSummary } from '@moryflow/ui/ai/tool';
import {
  isToolInProgressState,
  resolveToolOpenState,
} from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveToolOuterSummary } from '@moryflow/agents-runtime/ui-message/tool-command-summary';
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from '@moryflow/ui/ai/confirmation';
import type { MessageBodyToolModel } from './message-body-model';

type ToolPartProps = {
  part: ToolUIPart;
  index: number;
  messageId: string;
  toolModel: MessageBodyToolModel;
};

export const ToolPart = ({ part, index, messageId, toolModel }: ToolPartProps) => {
  const {
    onToolApproval,
    statusLabels,
    summaryLabels,
    outputLabels,
    uiLabels,
    canApplyDiff,
    onApplyDiff,
    onApplyDiffSuccess,
    onApplyDiffError,
  } = toolModel;
  const [isApproving, setIsApproving] = useState(false);
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const toolSummary = resolveToolOuterSummary({
    type: part.type,
    state: part.state as ToolState,
    input: (part.input as Record<string, unknown>) ?? undefined,
    output: part.output,
    labels: summaryLabels,
  });
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: part.state,
          hasManualExpanded: userOpenPreference === true,
        });
  const approvalId = part.approval?.id;
  const approvalVisible =
    part.state === 'approval-requested' || part.state === 'approval-responded';
  const approvalIsAlreadyHandled = part.approval?.reason === 'already_processed';

  const handleApproval = async (action: 'once' | 'allow_type' | 'deny') => {
    if (!approvalId || !onToolApproval || isApproving) {
      return;
    }
    setIsApproving(true);
    try {
      await Promise.resolve(onToolApproval({ approvalId, action }));
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setUserOpenPreference(nextOpen);
  };

  return (
    <Tool key={`${messageId}-tool-${index}`} open={isOpen} onOpenChange={handleOpenChange}>
      <ToolSummary
        summary={toolSummary.outerSummary}
        isStreaming={isToolInProgressState(part.state)}
        viewportAnchorId={`tool:${messageId}:${index}`}
      />
      <ToolContent open={isOpen} state={part.state as ToolState} statusLabels={statusLabels}>
        <ToolHeader
          type={part.type}
          state={part.state as ToolState}
          input={part.input as Record<string, unknown>}
          statusLabels={statusLabels}
          scriptType={toolSummary.scriptType}
          command={toolSummary.command}
        />

        {approvalVisible && approvalId ? (
          <div className="pb-2">
            <Confirmation
              state={part.state as ToolState}
              approval={part.approval}
              className="border border-border-muted/60"
            >
              <ConfirmationTitle>{uiLabels.approvalRequired}</ConfirmationTitle>
              <ConfirmationRequest>
                <p className="text-sm text-muted-foreground">{uiLabels.approvalRequestHint}</p>
                <div className="mt-2 rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-medium text-foreground">
                    {uiLabels.approvalHowToApplyTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {uiLabels.approvalAlwaysAllowHint}
                  </p>
                </div>
              </ConfirmationRequest>
              <ConfirmationAccepted>
                <p className="text-sm text-muted-foreground">
                  {approvalIsAlreadyHandled
                    ? uiLabels.approvalAlreadyHandled
                    : uiLabels.approvalGranted}
                </p>
              </ConfirmationAccepted>
              <ConfirmationActions>
                <ConfirmationAction
                  variant="secondary"
                  onClick={() => handleApproval('once')}
                  disabled={isApproving}
                >
                  {uiLabels.approveOnce}
                </ConfirmationAction>
                <ConfirmationAction
                  onClick={() => handleApproval('allow_type')}
                  disabled={isApproving}
                >
                  {uiLabels.approveAlways}
                </ConfirmationAction>
                <ConfirmationAction
                  variant="destructive"
                  onClick={() => handleApproval('deny')}
                  disabled={isApproving}
                >
                  {uiLabels.denyOnce}
                </ConfirmationAction>
              </ConfirmationActions>
            </Confirmation>
          </div>
        ) : null}

        <ToolOutput
          output={part.output}
          errorText={part.errorText}
          labels={outputLabels}
          onApplyDiff={canApplyDiff ? onApplyDiff : undefined}
          onApplyDiffSuccess={canApplyDiff ? onApplyDiffSuccess : undefined}
          onApplyDiffError={canApplyDiff ? onApplyDiffError : undefined}
        />
      </ToolContent>
    </Tool>
  );
};
