import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native'
import { useTheme } from '@/lib/hooks/use-theme'
import { themeTokensByMode, type ThemeMode } from './tokens/base'

export type ThemeColors = (typeof themeTokensByMode)['light']

export const THEME = themeTokensByMode

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useTheme()
  return colorScheme === 'dark' ? THEME.dark : THEME.light
}

export const NAV_THEME: Record<ThemeMode, Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
}
