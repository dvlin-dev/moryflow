/**
 * [PROPS]: ToolPartProps - 工具消息片段渲染参数
 * [EMITS]: onToolApproval/onApplyDiff
 * [POS]: ChatMessage 工具片段（审批 + 输出）
 * [UPDATE]: 2026-03-02 - 移除 ToolInput 展示，接入运行态展开/结束自动折叠策略
 * [UPDATE]: 2026-02-26 - ToolPart 改为接收 toolModel，减少参数平铺
 * [UPDATE]: 2026-02-26 - 从 ChatMessage 拆出 Tool 片段渲染
 * [UPDATE]: 2026-03-05 - 审批动作升级为 Approve once / Always allow / Deny，并新增适用范围提示
 * [UPDATE]: 2026-03-05 - Tool Header 接入共享命令摘要（scriptType + command），对齐 Bash Card 两行头
 * [UPDATE]: 2026-03-05 - 清理 onOpenFullOutput 透传，Tool 输出动作收敛到复制与 Apply to file
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import type { ToolUIPart } from 'ai';
import type { ToolState } from '@moryflow/ui/ai/tool';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@moryflow/ui/ai/tool';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveToolCommandSummary } from '@moryflow/agents-runtime/ui-message/tool-command-summary';
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
    outputLabels,
    uiLabels,
    canApplyDiff,
    onApplyDiff,
    onApplyDiffSuccess,
    onApplyDiffError,
  } = toolModel;
  const [isApproving, setIsApproving] = useState(false);
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const commandSummary = resolveToolCommandSummary({
    type: part.type,
    input: (part.input as Record<string, unknown>) ?? undefined,
    output: part.output,
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
      <ToolHeader
        type={part.type}
        state={part.state as ToolState}
        input={part.input as Record<string, unknown>}
        statusLabels={statusLabels}
        scriptType={commandSummary.scriptType}
        command={commandSummary.command}
      />
      <ToolContent>
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
