/**
 * 搜索输入框组件
 */

import { View, TextInput, Pressable } from 'react-native';
import { XIcon, SearchIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = '搜索笔记...',
}: SearchInputProps) {
  const colors = useThemeColors();

  return (
    <View className="bg-muted h-11 flex-row items-center rounded-xl px-3">
      <Icon as={SearchIcon} size={20} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        className="text-foreground ml-2 flex-1 text-[16px]"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Icon as={XIcon} size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}
