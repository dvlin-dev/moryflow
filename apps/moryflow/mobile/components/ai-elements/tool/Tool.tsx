/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含外层摘要标题与内层两行 Header/输出区
 *
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import * as React from 'react';
import { Pressable, View } from 'react-native';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveMobileToolShell } from '@/lib/chat/tool-shell';
import { useTranslation } from '@/lib/i18n';
import { useThemeColors } from '@/lib/theme';
import { ChevronDown } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ToolHeader } from './ToolHeader';
import { ToolContent } from './ToolContent';
import type { ToolProps } from './const';
import { getNextManualOpenPreference, resolveOpenStateFromPreference } from '../open-preference';

export function Tool({
  type,
  state,
  input,
  output,
  errorText,
  approval,
  onToolApproval,
}: ToolProps) {
  const { t } = useTranslation('chat');
  const colors = useThemeColors();
  const [userOpenPreference, setUserOpenPreference] = React.useState<boolean | null>(null);
  const shell = resolveMobileToolShell({
    type,
    state,
    input: input as Record<string, unknown> | undefined,
    output,
    labels: {
      statusLabels: {
        'input-streaming': t('statusPreparing'),
        'input-available': t('statusExecuting'),
        'approval-requested': t('statusWaitingConfirmation'),
        'approval-responded': t('statusConfirmed'),
        'output-available': t('statusCompleted'),
        'output-error': t('statusError'),
        'output-denied': t('statusSkipped'),
      },
      summaryLabels: {
        running: ({ tool, command }) => t('toolSummaryRunning', { tool, command }),
        success: ({ tool, command }) => t('toolSummarySuccess', { tool, command }),
        error: ({ tool, command }) => t('toolSummaryError', { tool, command }),
        skipped: ({ tool, command }) => t('toolSummarySkipped', { tool, command }),
      },
    },
  });
  const autoOpen = resolveToolOpenState({
    state,
    hasManualExpanded: false,
  });
  const isOpen = resolveOpenStateFromPreference({
    manualOpenPreference: userOpenPreference,
    autoOpen,
  });

  const handleToggle = React.useCallback(() => {
    setUserOpenPreference((prev) =>
      getNextManualOpenPreference({
        manualOpenPreference: prev,
        autoOpen,
      })
    );
  }, [autoOpen]);

  return (
    <View className="mb-3 w-full">
      <Pressable
        className="flex-row items-center gap-1 py-1 active:opacity-70"
        onPress={handleToggle}>
        <Text className="text-muted-foreground flex-1 text-sm" numberOfLines={1}>
          {shell.outerSummary}
        </Text>
        <Icon
          as={ChevronDown}
          size={14}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}
        />
      </Pressable>

      {isOpen ? (
        <View className="border-border/70 bg-muted/35 mt-1 overflow-hidden rounded-xl border">
          <ToolHeader
            type={type}
            state={state}
            scriptType={shell.scriptType}
            command={shell.command}
            statusLabel={shell.statusLabel}
          />
          <ToolContent
            output={output}
            errorText={errorText}
            state={state}
            outputMaxHeight={shell.outputMaxHeight}
            approval={approval}
            onToolApproval={onToolApproval}
          />
        </View>
      ) : null}
    </View>
  );
}
