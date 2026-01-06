/**
 * 搜索结果项组件
 */

import { memo } from 'react'
import { View, Pressable } from 'react-native'
import { Text } from '@/components/ui/text'
import { FileTextIcon } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'
import { formatRelativeTime } from '../helper'
import type { SearchResultItem as SearchResultItemType } from '../const'

interface SearchResultItemProps {
  item: SearchResultItemType
  onPress: () => void
}

export const SearchResultItem = memo(function SearchResultItem({
  item,
  onPress,
}: SearchResultItemProps) {
  const colors = useThemeColors()

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 px-4 active:opacity-70"
    >
      {/* 文件图标 */}
      <View className="w-10 h-10 rounded-[10px] bg-muted items-center justify-center">
        <FileTextIcon size={20} color={colors.textSecondary} />
      </View>

      {/* 文字内容 */}
      <View className="flex-1 ml-3">
        <Text className="text-[16px] font-medium text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-[13px] text-muted-foreground mt-0.5">
          {formatRelativeTime(item.openedAt)}
        </Text>
      </View>
    </Pressable>
  )
})
