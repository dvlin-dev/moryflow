/**
 * 搜索结果项组件
 */

import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { FileTextIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { formatRelativeTime } from '../helper';
import type { SearchResultItem as SearchResultItemType } from '../const';

interface SearchResultItemProps {
  item: SearchResultItemType;
  onPress: () => void;
}

export const SearchResultItem = memo(function SearchResultItem({
  item,
  onPress,
}: SearchResultItemProps) {
  const colors = useThemeColors();

  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3 active:opacity-70">
      {/* 文件图标 */}
      <View className="bg-muted h-10 w-10 items-center justify-center rounded-[10px]">
        <Icon as={FileTextIcon} size={20} color={colors.textSecondary} />
      </View>

      {/* 文字内容 */}
      <View className="ml-3 flex-1">
        <Text className="text-foreground text-[16px] font-medium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-[13px]">
          {formatRelativeTime(item.openedAt)}
        </Text>
      </View>
    </Pressable>
  );
});
