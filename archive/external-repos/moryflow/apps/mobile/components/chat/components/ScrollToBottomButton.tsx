/**
 * ScrollToBottomButton
 *
 * 滚动到底部按钮，当用户不在底部时显示
 * 使用纯 style（Animated 组件不支持 className）
 */

import { Pressable, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useThemeColors } from '@/lib/theme';
import { useMemo } from 'react';

interface ScrollToBottomButtonProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScrollToBottomButton({ onPress }: ScrollToBottomButtonProps) {
  const colors = useThemeColors();

  // Animated 组件必须使用纯 style
  const buttonStyle = useMemo<ViewStyle>(
    () => ({
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    }),
    [colors]
  );

  return (
    <AnimatedPressable
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      onPress={onPress}
      style={buttonStyle}
    >
      <ChevronDown size={20} color={colors.textSecondary} />
    </AnimatedPressable>
  );
}
