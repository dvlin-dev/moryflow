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

export function Tool({
  type,
  state,
  input,
  output,
  errorText,
  defaultOpen = false,
  approval,
  onToolApproval,
}: ToolProps) {
  const [userOpenPreference, setUserOpenPreference] = React.useState<boolean | null>(
    defaultOpen ? true : null
  );
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state,
          hasManualExpanded: userOpenPreference === true,
        });

  const handleToggle = React.useCallback(() => {
    setUserOpenPreference((prev) => {
      if (prev === null) {
        return isOpen ? false : true;
      }
      return prev ? false : true;
    });
  }, [isOpen]);

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
