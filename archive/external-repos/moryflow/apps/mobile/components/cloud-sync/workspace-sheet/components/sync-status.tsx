/**
 * [PROPS]: isSyncing, statusInfo, lastSyncText, colors
 * [EMITS]: none
 * [POS]: 同步状态指示器，显示同步图标、状态文本和最后同步时间
 */

import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useSharedValue,
} from 'react-native-reanimated'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import type { SyncStatusProps } from '../const'

export function SyncStatus({ isSyncing, statusInfo, lastSyncText, colors }: SyncStatusProps) {
  const rotation = useSharedValue(0)

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false)
    } else {
      cancelAnimation(rotation)
      rotation.value = 0
    }
  }, [isSyncing, rotation])

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        marginTop: -8,
        gap: 6,
      }}
    >
      {isSyncing ? (
        <Animated.View style={spinStyle}>
          <Icon as={statusInfo.icon} size={14} color={statusInfo.color} />
        </Animated.View>
      ) : (
        <Icon as={statusInfo.icon} size={14} color={statusInfo.color} />
      )}
      <Text style={{ fontSize: 13, color: statusInfo.color }}>{statusInfo.text}</Text>
      <Text style={{ fontSize: 13, color: colors.textTertiary }}>· {lastSyncText}</Text>
    </View>
  )
}
