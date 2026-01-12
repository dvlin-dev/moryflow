/**
 * [PROPS]: TitleInputProps - 标题输入框 props（基于 RN TextInputProps）
 * [POS]: Editor 标题输入组件，统一处理明暗主题下的文本/placeholder 颜色
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export type TitleInputProps = TextInputProps & { className?: string };

export const TitleInput = forwardRef<TextInput, TitleInputProps>(function TitleInput(
  { className, placeholderTextColor, selectionColor, style, ...props },
  ref
) {
  const colors = useThemeColors();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
      selectionColor={selectionColor ?? colors.primary}
      className={['text-foreground text-xl font-semibold', className].filter(Boolean).join(' ')}
      style={[{ padding: 0, margin: 0 }, style]}
      {...props}
    />
  );
});

TitleInput.displayName = 'TitleInput';
