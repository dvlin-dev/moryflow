import React from 'react'
import { View, Pressable, Platform, Alert } from 'react-native'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { useThemeColors } from '@/lib/theme'
import { ChevronRightIcon, GlobeIcon } from 'lucide-react-native'
import {
  useLanguage,
  useTranslation,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '@moryflow/shared-i18n'

// iOS 平台动态导入 SwiftUI 组件
type PickerType = React.ComponentType<{
  options: string[]
  selectedIndex: number
  onOptionSelected: (event: { nativeEvent: { index: number } }) => void
  variant?: 'menu' | 'segmented' | 'wheel'
}> | null

type HostType = React.ComponentType<{
  matchContents?: boolean
  style?: React.CSSProperties
  children?: React.ReactNode
}> | null

let Picker: PickerType = null
let Host: HostType = null

if (Platform.OS === 'ios') {
  try {
    const swiftUI = require('@expo/ui/swift-ui')
    Picker = swiftUI.Picker as PickerType
    Host = swiftUI.Host as HostType
  } catch (error) {
    console.warn('[@expo/ui/swift-ui] 组件加载失败，回退到 Alert:', error)
  }
}

function showAndroidLanguageAlert(
  currentLanguage: SupportedLanguage,
  onLanguageSelect: (language: SupportedLanguage) => void,
  title: string
): void {
  const languages = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]

  const buttons = languages.map((lang) => {
    const info = SUPPORTED_LANGUAGES[lang]
    const isCurrent = lang === currentLanguage
    return {
      text: `${isCurrent ? '✓ ' : ''}${info.nativeName}`,
      onPress: () => {
        if (!isCurrent) {
          onLanguageSelect(lang)
        }
      },
    }
  })

  Alert.alert(title, undefined, buttons, { cancelable: true })
}

function IOSLanguagePicker(): React.JSX.Element {
  const { currentLanguage, changeLanguage } = useLanguage()
  const { t } = useTranslation('settings')
  const colors = useThemeColors()

  const languages = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]
  const languageOptions = languages.map((lang) => SUPPORTED_LANGUAGES[lang].nativeName)
  const selectedIndex = languages.indexOf(currentLanguage)

  const handleLanguageChange = (event: { nativeEvent: { index: number } }): void => {
    const newIndex = event.nativeEvent.index
    const newLanguage = languages[newIndex]
    if (newLanguage && newLanguage !== currentLanguage) {
      changeLanguage(newLanguage)
    }
  }

  if (Picker && Host) {
    return (
      <View className="flex-row items-center justify-between px-4 py-3 min-h-[44px]">
        <View className="flex-row items-center">
          <Icon as={GlobeIcon} size={22} color={colors.primary} style={{ marginRight: 12 }} />
          <Text className="text-[17px] text-foreground">{t('language')}</Text>
        </View>

        <View style={{ marginRight: -12 }}>
          <Host style={{ minHeight: 32, minWidth: 120 }}>
            <Picker
              options={languageOptions}
              selectedIndex={selectedIndex}
              onOptionSelected={handleLanguageChange}
              variant="menu"
            />
          </Host>
        </View>
      </View>
    )
  }

  return <AndroidLanguageSelector />
}

function AndroidLanguageSelector(): React.JSX.Element {
  const { currentLanguage, changeLanguage } = useLanguage()
  const { t } = useTranslation('settings')
  const colors = useThemeColors()

  const currentLanguageInfo = SUPPORTED_LANGUAGES[currentLanguage]

  const handleLanguageSelect = (language: SupportedLanguage): void => {
    changeLanguage(language)
  }

  const showLanguageMenu = (): void => {
    showAndroidLanguageAlert(currentLanguage, handleLanguageSelect, t('selectLanguage'))
  }

  return (
    <Pressable
      onPress={showLanguageMenu}
      className="flex-row items-center justify-between px-4 py-3 min-h-[44px] active:bg-surface-pressed"
    >
      <View className="flex-row items-center">
        <Icon as={GlobeIcon} size={22} color={colors.primary} style={{ marginRight: 12 }} />
        <Text className="text-[17px] text-foreground">{t('language')}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="text-[17px] text-muted-foreground">
          {currentLanguageInfo.nativeName}
        </Text>
        <Icon as={ChevronRightIcon} size={18} color={colors.iconMuted} />
      </View>
    </Pressable>
  )
}

export function LanguageSelector(): React.JSX.Element {
  if (Platform.OS === 'ios' && Picker && Host) {
    return <IOSLanguagePicker />
  }
  return <AndroidLanguageSelector />
}
