/**
 * [PROVIDES]: useMessageToolModel - ChatMessage 工具渲染模型（labels + callbacks）
 * [DEPENDS]: useTranslation, desktopAPI.chat/files, toast
 * [POS]: 收敛 ChatMessage 的 tool 相关参数与副作用逻辑
 * [UPDATE]: 2026-03-02 - 移除 Tool 参数文案（消息流不再展示 ToolInput）
 * [UPDATE]: 2026-02-26 - 下沉 tool labels/callbacks，减少 ChatMessage 参数平铺
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
      'output-error': t('statusError'),
      'output-denied': t('statusSkipped'),
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
      viewFullOutput: t('viewFullOutput'),
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
      approveOnce: t('approveOnce'),
      approveAlways: t('approveAlways'),
    }),
    [t]
  );

  const onOpenFullOutput = useCallback(
    async (fullPath: string) => {
      if (typeof window === 'undefined' || !window.desktopAPI?.files?.openPath) {
        toast.error(t('openFileFailed'));
        return;
      }
      try {
        await window.desktopAPI.files.openPath({ path: fullPath });
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : t('openFileFailed'));
      }
    },
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
      outputLabels,
      uiLabels,
      onOpenFullOutput,
      canApplyDiff,
      onApplyDiff,
      onApplyDiffSuccess,
      onApplyDiffError,
    }),
    [
      onToolApproval,
      statusLabels,
      outputLabels,
      uiLabels,
      onOpenFullOutput,
      canApplyDiff,
      onApplyDiff,
      onApplyDiffSuccess,
      onApplyDiffError,
    ]
  );
};
