/**
 * Tool 组件
 *
 * 可折叠的工具调用显示，包含状态、输入和输出
 */

import * as React from 'react';
import { View } from 'react-native';
import {
  resolveInitialToolOpen,
  resolveToolVisibilityAction,
} from '@/lib/chat/visibility-transitions';
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
  const [isOpen, setIsOpen] = React.useState(() => resolveInitialToolOpen({ defaultOpen, state }));
  const previousState = React.useRef<string | undefined>(state);
  const hasManualExpanded = React.useRef(false);

  React.useEffect(() => {
    const visibilityAction = resolveToolVisibilityAction({
      previousState: previousState.current,
      nextState: state,
      hasManualExpanded: hasManualExpanded.current,
    });

    if (visibilityAction === 'expand') {
      setIsOpen(true);
    } else if (visibilityAction === 'collapse') {
      setIsOpen(false);
    }
    previousState.current = state;
  }, [state]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        hasManualExpanded.current = true;
      }
      return nextOpen;
    });
  }, []);

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
