import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Dimensions,
  TouchableOpacity,
  View,
  type LayoutRectangle,
} from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

export interface PopoverMenuItem {
  label: string
  onPress: () => void
  destructive?: boolean
}

type TouchableOpacityRef = React.ElementRef<typeof TouchableOpacity>

interface PopoverMenuProps {
  visible: boolean
  onDismiss: () => void
  anchorRef: React.RefObject<View | TouchableOpacityRef | null>
  items: PopoverMenuItem[]
  offset?: { x?: number; y?: number }
}

export function PopoverMenu({ visible, onDismiss, anchorRef, items, offset }: PopoverMenuProps): React.ReactElement | null {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.95)).current
  const [anchorLayout, setAnchorLayout] = React.useState<LayoutRectangle | null>(null)

  useEffect(() => {
    if (visible && anchorRef.current) {
      anchorRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        setAnchorLayout({ x, y, width, height })
      })
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, anchorRef, opacity, scale])

  const positionStyle = useMemo(() => {
    if (!anchorLayout) return undefined
    const horizontalOffset = offset?.x ?? 0
    const verticalOffset = offset?.y ?? 0
    const top = anchorLayout.y + anchorLayout.height + verticalOffset
    const screenWidth = Dimensions.get('window').width
    const right = Math.max(16, screenWidth - (anchorLayout.x + anchorLayout.width) + horizontalOffset)
    return { top, right }
  }, [anchorLayout, offset])

  const handlePress = useCallback(
    (item: PopoverMenuItem) => {
      onDismiss()
      requestAnimationFrame(item.onPress)
    },
    [onDismiss]
  )

  if (!visible || !positionStyle) return null

  return (
    <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={onDismiss}>
      <Animated.View
        className="absolute min-w-[180px] bg-gray-900/97 rounded-xl py-2 px-1"
        style={[
          positionStyle,
          {
            opacity,
            transform: [{ scale }],
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          },
        ]}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            className={cn(
              'py-2.5 px-3 rounded-[10px]',
              item.destructive && 'bg-red-600/15'
            )}
            onPress={() => handlePress(item)}
          >
            <Text className={cn(
              'text-slate-50 text-sm font-medium',
              item.destructive && 'text-red-300'
            )}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </TouchableOpacity>
  )
}
