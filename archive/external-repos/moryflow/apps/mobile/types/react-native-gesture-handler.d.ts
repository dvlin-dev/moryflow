import type { ComponentType, ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

declare module 'react-native-gesture-handler' {
  export const GestureHandlerRootView: ComponentType<{ style?: StyleProp<ViewStyle>; className?: string; children?: ReactNode }>
}
