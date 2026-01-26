/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含状态、输入和输出
 */

import * as React from 'react';
import { View } from 'react-native';
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
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <View className="border-border bg-surface mb-3 w-full overflow-hidden rounded-xl border">
      <ToolHeader type={type} state={state} input={input} isOpen={isOpen} onToggle={handleToggle} />
      {isOpen && (
        <ToolContent
          input={input}
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
