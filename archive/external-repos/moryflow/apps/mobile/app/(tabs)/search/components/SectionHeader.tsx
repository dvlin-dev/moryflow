/**
 * 分组标题组件
 */

import { View } from 'react-native'
import { Text } from '@/components/ui/text'

interface SectionHeaderProps {
  title: string
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-[13px] font-semibold text-secondary-foreground">{title}</Text>
    </View>
  )
}
