/**
 * Tool Content 组件
 *
 * 显示审批区与固定高度滚动输出区（含右上复制按钮与顶部遮罩）
 *
 * [UPDATE]: 2026-03-05 - 输出区固定高度为 180，新增复制按钮与顶部遮罩层
 * [UPDATE]: 2026-03-05 - 复制能力改为跨平台 clipboard 工具（web/native），避免原生端按钮失效
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { buildMobileToolCopyText } from '@/lib/chat/tool-shell';
import { copyTextToClipboard } from '@/lib/platform/clipboard';
import { ToolOutput } from '../tool-output';
import type { ToolState } from './const';

interface ToolContentProps {
  output?: unknown;
  errorText?: string;
  state: ToolState;
  outputMaxHeight?: number;
  approval?: import('ai').ToolUIPart['approval'];
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

export function ToolContent({
  output,
  errorText,
  state,
  outputMaxHeight = 180,
  approval,
  onToolApproval,
}: ToolContentProps) {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = React.useState(false);
  const [isApproving, setIsApproving] = React.useState(false);
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const approvalId = approval?.id;
  const approvalVisible = state === 'approval-requested' || state === 'approval-responded';
  const canApprove = state === 'approval-requested' && approvalId && onToolApproval;
  const approvalIsAlreadyHandled = approval?.reason === 'already_processed';
  const hasOutput = output !== undefined || errorText !== undefined;
  const copyText = React.useMemo(
    () => buildMobileToolCopyText({ output, errorText }),
    [output, errorText]
  );

  const handleApprove = async (remember: 'once' | 'always') => {
    if (!approvalId || !onToolApproval) return;
    setIsApproving(true);
    try {
      await Promise.resolve(onToolApproval({ approvalId, remember }));
    } finally {
      setIsApproving(false);
    }
  };

  const handleCopy = React.useCallback(async () => {
    if (!copyText) {
      return;
    }

    const copiedSuccess = await copyTextToClipboard(copyText);
    if (!copiedSuccess) {
      return;
    }

    setCopied(true);
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimerRef.current = null;
    }, 1200);
  }, [copyText]);

  React.useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  return (
    <View className="pt-2">
      {approvalVisible && (
        <View className="pb-3">
          <View className="border-border/60 gap-2 rounded-lg border p-3">
            <Text className="text-muted-foreground text-xs font-medium uppercase">
              {t('approvalRequired')}
            </Text>
            {state === 'approval-requested' ? (
              <Text className="text-muted-foreground text-sm">{t('approvalRequestHint')}</Text>
            ) : (
              <Text className="text-muted-foreground text-sm">
                {approvalIsAlreadyHandled ? t('approvalAlreadyHandled') : t('approvalGranted')}
              </Text>
            )}
            {canApprove && (
              <View className="flex-row justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => handleApprove('once')}
                  disabled={isApproving}>
                  <Text className="text-xs">{t('approveOnce')}</Text>
                </Button>
                <Button size="sm" onPress={() => handleApprove('always')} disabled={isApproving}>
                  <Text className="text-xs">{t('approveAlways')}</Text>
                </Button>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 输出结果 */}
      {hasOutput && (
        <View className="border-border/60 bg-background/80 relative overflow-hidden rounded-lg border">
          <ScrollView style={{ maxHeight: outputMaxHeight }}>
            <ToolOutput output={output} errorText={errorText} />
          </ScrollView>

          <View
            pointerEvents="none"
            className="bg-background/80 absolute top-0 right-0 left-0 h-6"
          />

          <Pressable className="absolute top-2 right-2" onPress={handleCopy}>
            <View className="border-border/70 bg-background/90 rounded-md border px-2 py-1">
              <Text className="text-muted-foreground text-[11px]">
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}
