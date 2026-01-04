/**
 * 搜索输入框组件
 */

import { View, TextInput, Pressable } from 'react-native'
import { XIcon, SearchIcon } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'

interface SearchInputProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChangeText, placeholder = '搜索笔记...' }: SearchInputProps) {
  const colors = useThemeColors()

  return (
    <View className="flex-row items-center bg-muted rounded-xl px-3 h-11">
      <SearchIcon size={20} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        className="flex-1 ml-2 text-[16px] text-foreground"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <XIcon size={18} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  )
}
