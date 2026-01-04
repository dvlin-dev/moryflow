/**
 * [PROPS]: title
 * [EMITS]: none
 * [POS]: iOS 风格分区标题（用于分组外的独立标题）
 */

import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import type { SectionHeaderProps } from '../const'

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View className="pt-6 pb-2 px-8">
      <Text className="text-[13px] text-muted-foreground uppercase">
        {title}
      </Text>
    </View>
  )
}
