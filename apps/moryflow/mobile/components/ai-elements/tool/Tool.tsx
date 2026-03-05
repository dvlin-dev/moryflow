/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含两行 Header、审批区与固定高度输出区
 *
 * [UPDATE]: 2026-03-05 - 接入 mobile tool-shell 视图模型（scriptType/command/status）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { View } from 'react-native';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveMobileToolShell } from '@/lib/chat/tool-shell';
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
  const [userOpenPreference, setUserOpenPreference] = React.useState<boolean | null>(null);
  const shell = resolveMobileToolShell({
    type,
    state,
    input: input as Record<string, unknown> | undefined,
    output,
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
    <View className="border-border/70 bg-muted/35 mb-3 w-full rounded-xl border">
      <ToolHeader
        type={type}
        state={state}
        scriptType={shell.scriptType}
        command={shell.command}
        statusLabel={shell.statusLabel}
        isOpen={isOpen}
        onToggle={handleToggle}
      />
      {isOpen && (
        <ToolContent
          output={output}
          errorText={errorText}
          state={state}
          outputMaxHeight={shell.outputMaxHeight}
          approval={approval}
          onToolApproval={onToolApproval}
        />
      )}
    </View>
  );
}
