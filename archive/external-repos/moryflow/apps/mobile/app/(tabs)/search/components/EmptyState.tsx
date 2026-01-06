/**
 * 空状态组件
 */

import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { SearchIcon, FileIcon } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'

interface EmptyStateProps {
  hasQuery: boolean
  query: string
}

export function EmptyState({ hasQuery, query }: EmptyStateProps) {
  const colors = useThemeColors()

  return (
    <View className="flex-1 items-center justify-center px-8">
      {hasQuery ? (
        <>
          <SearchIcon size={48} color={colors.textTertiary} />
          <Text className="mt-4 text-[16px] text-secondary-foreground text-center">
            未找到 "{query}" 相关结果
          </Text>
        </>
      ) : (
        <>
          <FileIcon size={48} color={colors.textTertiary} />
          <Text className="mt-4 text-[16px] text-secondary-foreground text-center">
            打开一些文件后，它们会出现在这里
          </Text>
        </>
      )}
    </View>
  )
}
