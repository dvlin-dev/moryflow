/**
 * [PROVIDES]: useMessageToolModel - ChatMessage 工具渲染模型（labels + callbacks）
 * [DEPENDS]: useTranslation, desktopAPI.chat/files, toast
 * [POS]: 收敛 ChatMessage 的 tool 相关参数与副作用逻辑
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import type { ToolDiffResult } from '@moryflow/ui/ai/tool';

import type { MessageBodyToolModel } from './message-body-model';

type UseMessageToolModelParams = {
  onToolApproval?: MessageBodyToolModel['onToolApproval'];
};

export const useMessageToolModel = ({
  onToolApproval,
}: UseMessageToolModelParams): MessageBodyToolModel => {
  const { t } = useTranslation('chat');

  const statusLabels = useMemo(
    () => ({
      'input-streaming': t('statusPreparing'),
      'input-available': t('statusExecuting'),
      'approval-requested': t('statusWaitingConfirmation'),
      'approval-responded': t('statusConfirmed'),
      'output-available': t('statusCompleted'),
      'output-interrupted': t('statusInterrupted'),
      'output-error': t('statusError'),
      'output-denied': t('statusSkipped'),
    }),
    [t]
  );

  const summaryLabels = useMemo(
    () => ({
      running: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummaryRunning', { tool, command }),
      success: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummarySuccess', { tool, command }),
      interrupted: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummaryInterrupted', { tool, command }),
      error: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummaryError', { tool, command }),
      skipped: ({ tool, command }: { tool: string; command: string }) =>
        t('toolSummarySkipped', { tool, command }),
    }),
    [t]
  );

  const outputLabels = useMemo(
    () => ({
      result: t('resultLabel'),
      error: t('errorLabel'),
      targetFile: t('targetFile'),
      contentTooLong: t('contentTooLong'),
      outputTruncated: t('outputTruncated'),
      fullOutputPath: t('fullOutputPath'),
      applyToFile: t('applyToFile'),
      applied: t('written'),
      applying: t('applyToFile'),
      noTasks: t('noTasks'),
      tasksCompleted: (completed: number, total: number) =>
        t('tasksCompleted', { completed, total }),
    }),
    [t]
  );

  const uiLabels = useMemo(
    () => ({
      approvalRequired: t('approvalRequired'),
      approvalRequestHint: t('approvalRequestHint'),
      approvalGranted: t('approvalGranted'),
      approvalAlreadyHandled: t('approvalAlreadyHandled'),
      approveOnce: t('approveOnce'),
      approveAlways: t('approveAlways'),
      denyOnce: t('denyOnce'),
      approvalHowToApplyTitle: t('approvalHowToApplyTitle'),
      approvalAlwaysAllowHint: t('approvalAlwaysAllowHint'),
    }),
    [t]
  );

  const onApplyDiff = useCallback(
    async (result: ToolDiffResult) => {
      if (typeof window === 'undefined' || !window.desktopAPI?.chat?.applyEdit) {
        throw new Error(t('writeFailed'));
      }
      await window.desktopAPI.chat.applyEdit({
        path: result.path!,
        baseSha: result.baseSha!,
        patch: result.patch,
        content: result.content,
        mode: result.mode ?? 'patch',
      });
    },
    [t]
  );

  const canApplyDiff = typeof window !== 'undefined' && Boolean(window.desktopAPI?.chat?.applyEdit);

  const onApplyDiffSuccess = useCallback(() => {
    toast.success(t('fileWritten'));
  }, [t]);

  const onApplyDiffError = useCallback(
    (error: unknown) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t('writeFailed'));
    },
    [t]
  );

  return useMemo(
    () => ({
      onToolApproval,
      statusLabels,
      summaryLabels,
      outputLabels,
      uiLabels,
      canApplyDiff,
      onApplyDiff,
      onApplyDiffSuccess,
      onApplyDiffError,
    }),
    [
      onToolApproval,
      statusLabels,
      summaryLabels,
      outputLabels,
      uiLabels,
      canApplyDiff,
      onApplyDiff,
      onApplyDiffSuccess,
      onApplyDiffError,
    ]
  );
};
