/**
 * 空状态组件
 */

import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SearchIcon, FileIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';

interface EmptyStateProps {
  hasQuery: boolean;
  query: string;
}

export function EmptyState({ hasQuery, query }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 items-center justify-center px-8">
      {hasQuery ? (
        <>
          <Icon as={SearchIcon} size={48} color={colors.textTertiary} />
          <Text className="text-secondary-foreground mt-4 text-center text-[16px]">
            未找到 "{query}" 相关结果
          </Text>
        </>
      ) : (
        <>
          <Icon as={FileIcon} size={48} color={colors.textTertiary} />
          <Text className="text-secondary-foreground mt-4 text-center text-[16px]">
            打开一些文件后，它们会出现在这里
          </Text>
        </>
      )}
    </View>
  );
}
