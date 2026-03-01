/**
 * [PROPS]: ToolPartProps - 工具消息片段渲染参数
 * [EMITS]: onToolApproval/onOpenFullOutput/onApplyDiff
 * [POS]: ChatMessage 工具片段（审批 + 输出）
 * [UPDATE]: 2026-03-02 - 移除 ToolInput 展示，接入运行态展开/结束自动折叠策略
 * [UPDATE]: 2026-02-26 - ToolPart 改为接收 toolModel，减少参数平铺
 * [UPDATE]: 2026-02-26 - 从 ChatMessage 拆出 Tool 片段渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useRef, useState } from 'react';
import type { ToolUIPart } from 'ai';
import type { ToolState } from '@moryflow/ui/ai/tool';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@moryflow/ui/ai/tool';
import {
  isToolInProgressState,
  shouldAutoCollapse,
} from '@moryflow/agents-runtime/ui-message/visibility-policy';
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
    onOpenFullOutput,
    canApplyDiff,
    onApplyDiff,
    onApplyDiffSuccess,
    onApplyDiffError,
  } = toolModel;
  const [isApproving, setIsApproving] = useState(false);
  const [isOpen, setIsOpen] = useState(() => isToolInProgressState(part.state));
  const hasManualExpanded = useRef(false);
  const prevState = useRef<string | undefined>(part.state);
  const approvalId = part.approval?.id;
  const approvalVisible =
    part.state === 'approval-requested' || part.state === 'approval-responded';

  useEffect(() => {
    if (isToolInProgressState(part.state)) {
      setIsOpen(true);
    } else if (shouldAutoCollapse(prevState.current, part.state) && !hasManualExpanded.current) {
      setIsOpen(false);
    }

    prevState.current = part.state;
  }, [part.state]);

  const handleApproval = async (remember: 'once' | 'always') => {
    if (!approvalId || !onToolApproval || isApproving) {
      return;
    }
    setIsApproving(true);
    try {
      await Promise.resolve(onToolApproval({ approvalId, remember }));
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      hasManualExpanded.current = true;
    }
    setIsOpen(nextOpen);
  };

  return (
    <Tool
      key={`${messageId}-tool-${index}`}
      className="mb-3 w-full border-0 bg-transparent p-0"
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <ToolHeader
        type={part.type}
        state={part.state as ToolState}
        input={part.input as Record<string, unknown>}
        statusLabels={statusLabels}
        className="px-0 py-0.5"
      />
      <ToolContent className="pt-2">
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
              </ConfirmationRequest>
              <ConfirmationAccepted>
                <p className="text-sm text-muted-foreground">{uiLabels.approvalGranted}</p>
              </ConfirmationAccepted>
              <ConfirmationActions>
                <ConfirmationAction
                  variant="secondary"
                  onClick={() => handleApproval('once')}
                  disabled={isApproving}
                >
                  {uiLabels.approveOnce}
                </ConfirmationAction>
                <ConfirmationAction onClick={() => handleApproval('always')} disabled={isApproving}>
                  {uiLabels.approveAlways}
                </ConfirmationAction>
              </ConfirmationActions>
            </Confirmation>
          </div>
        ) : null}

        <ToolOutput
          output={part.output}
          errorText={part.errorText}
          labels={outputLabels}
          onOpenFullOutput={onOpenFullOutput}
          onApplyDiff={canApplyDiff ? onApplyDiff : undefined}
          onApplyDiffSuccess={canApplyDiff ? onApplyDiffSuccess : undefined}
          onApplyDiffError={canApplyDiff ? onApplyDiffError : undefined}
        />
      </ToolContent>
    </Tool>
  );
};
