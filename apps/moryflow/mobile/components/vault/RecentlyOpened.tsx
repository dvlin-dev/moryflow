/**
 * 最近打开的文档卡片组件
 *
 * 显示在首页头部下方，横向滚动展示最近打开的文档
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { FileTextIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useRecentlyOpened, type RecentlyOpenedItem } from '@/lib/vault/recently-opened';

interface RecentlyOpenedProps {
  /** 点击卡片后的回调（可选，用于外部跟踪） */
  onItemPress?: (item: RecentlyOpenedItem) => void;
}

/**
 * 最近打开的文档卡片
 */
const RecentCard = React.memo(function RecentCard({
  item,
  onPress,
}: {
  item: RecentlyOpenedItem;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      className="bg-card border-border mr-3 h-[100px] w-[140px] justify-between rounded-xl border p-3">
      {/* 图标 */}
      <View className="bg-muted h-8 w-8 items-center justify-center rounded-lg">
        {item.icon ? (
          <Text className="text-[18px]">{item.icon}</Text>
        ) : (
          <Icon as={FileTextIcon} size={18} color={colors.textSecondary} />
        )}
      </View>

      {/* 标题 */}
      <Text className="text-foreground text-[14px] font-medium" numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );
});

/**
 * 最近打开的文档横向滚动区域
 */
export function RecentlyOpened({ onItemPress }: RecentlyOpenedProps) {
  const router = useRouter();
  const { items, isLoading } = useRecentlyOpened();

  const handlePress = useCallback(
    (item: RecentlyOpenedItem) => {
      onItemPress?.(item);
      // 使用 fileId 导航
      router.push({ pathname: '/(editor)/[fileId]', params: { fileId: item.fileId } });
    },
    [router, onItemPress]
  );

  // 不显示：正在加载或没有数据
  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <View className="mb-4">
      {/* Section 标题 */}
      <Text className="text-secondary-foreground mb-3 px-4 text-[13px] font-semibold">
        最近打开
      </Text>

      {/* 横向滚动卡片 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((item) => (
          <RecentCard key={item.path} item={item} onPress={() => handlePress(item)} />
        ))}
      </ScrollView>
    </View>
  );
}
