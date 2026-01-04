/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 修改密码页面，iOS 原生风格
 */

import { View, ScrollView, Alert, TextInput } from 'react-native'
import * as React from 'react'

import { Text } from '@/components/ui/text'
import { PasswordStrengthIndicator } from '@/components/auth'
import { useMembershipUser, useMembershipAuth, PASSWORD_CONFIG } from '@/lib/server'
import { useThemeColors } from '@/lib/theme'
import { useChangePassword } from '@/lib/contexts/change-password.context'
import { useTranslation } from '@aiget/i18n'
import { SettingsGroup } from '@/components/settings'

export default function ChangePasswordScreen() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { t: tValidation } = useTranslation('validation')
  const { user } = useMembershipUser()
  const { isLoading } = useMembershipAuth()
  const { setCanSave, setIsLoading: setHeaderLoading, setOnSave } = useChangePassword()
  const colors = useThemeColors()

  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(tCommon('error'), t('enterCurrentPassword'))
      return
    }

    if (!newPassword.trim()) {
      Alert.alert(tCommon('error'), t('enterNewPassword'))
      return
    }

    if (newPassword.length < PASSWORD_CONFIG.MIN_LENGTH) {
      Alert.alert(tCommon('error'), t('passwordMinLength', { length: PASSWORD_CONFIG.MIN_LENGTH }))
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(tCommon('error'), tValidation('passwordMismatch'))
      return
    }

    Alert.alert(tCommon('info'), tCommon('comingSoon'), [{ text: tCommon('confirm') }])
  }

  const canProceed =
    !!currentPassword.trim() &&
    !!newPassword.trim() &&
    !!confirmPassword.trim() &&
    newPassword === confirmPassword &&
    newPassword.length >= PASSWORD_CONFIG.MIN_LENGTH &&
    !isLoading

  React.useEffect(() => {
    setCanSave(canProceed)
    setOnSave(() => handleChangePassword)
  }, [canProceed, setCanSave, setOnSave])

  React.useEffect(() => {
    setHeaderLoading(isLoading)
  }, [isLoading, setHeaderLoading])

  return (
    <View className="flex-1 bg-page-background">
      <ScrollView className="flex-1 pt-6">
        {/* 当前密码 */}
        <SettingsGroup title={t('currentPassword')}>
          <TextInput
            className="text-[17px] text-foreground py-3 px-4"
            placeholder={t('enterCurrentPassword')}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </SettingsGroup>

        {/* 新密码 */}
        <SettingsGroup title={t('newPassword')}>
          <TextInput
            className="text-[17px] text-foreground py-3 px-4"
            placeholder={t('enterNewPassword')}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="px-4 pb-3">
            <PasswordStrengthIndicator password={newPassword} />
          </View>
        </SettingsGroup>

        {/* 确认密码 */}
        <SettingsGroup title={t('confirmNewPassword')}>
          <TextInput
            className="text-[17px] text-foreground py-3 px-4"
            placeholder={t('confirmNewPassword')}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <View className="px-4 pb-3">
              <Text className="text-[13px] text-destructive">
                {tValidation('passwordMismatch')}
              </Text>
            </View>
          )}
        </SettingsGroup>

        {/* 密码提示 */}
        <View className="px-8 pt-2">
          <Text className="text-[13px] text-muted-foreground leading-[18px]">
            {t('passwordHints')}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}
