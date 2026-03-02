/**
 * Tool Content 组件
 *
 * 显示工具输入参数和输出结果
 */

import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { ToolOutput } from '../tool-output';
import type { ToolState } from './const';

interface ToolContentProps {
  output?: unknown;
  errorText?: string;
  state: ToolState;
  approval?: import('ai').ToolUIPart['approval'];
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

export function ToolContent({
  output,
  errorText,
  state,
  approval,
  onToolApproval,
}: ToolContentProps) {
  const { t } = useTranslation('chat');
  const [isApproving, setIsApproving] = React.useState(false);
  const approvalId = approval?.id;
  const approvalVisible = state === 'approval-requested' || state === 'approval-responded';
  const canApprove = state === 'approval-requested' && approvalId && onToolApproval;
  const hasOutput = output !== undefined || errorText !== undefined;

  const handleApprove = async (remember: 'once' | 'always') => {
    if (!approvalId || !onToolApproval) return;
    setIsApproving(true);
    try {
      await Promise.resolve(onToolApproval({ approvalId, remember }));
    } finally {
      setIsApproving(false);
    }
  };

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
              <Text className="text-muted-foreground text-sm">{t('approvalGranted')}</Text>
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
      {hasOutput && <ToolOutput output={output} errorText={errorText} />}
    </View>
  );
}
