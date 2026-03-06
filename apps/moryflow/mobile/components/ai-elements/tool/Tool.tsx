/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含状态、输入和输出
 */

import * as React from 'react';
import { View } from 'react-native';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
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
      <ToolHeader type={type} state={state} input={input} isOpen={isOpen} onToggle={handleToggle} />
      {isOpen && (
        <ToolContent
          output={output}
          errorText={errorText}
          state={state}
          approval={approval}
          onToolApproval={onToolApproval}
        />
      )}
    </View>
  );
}
