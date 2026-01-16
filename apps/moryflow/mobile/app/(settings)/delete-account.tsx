/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 删除账户页面，iOS 原生风格
 */

import { View, ScrollView, Alert, Pressable, TextInput, ActivityIndicator } from 'react-native'
import * as React from 'react'
import { router } from 'expo-router'
import { AlertTriangleIcon, CheckIcon } from 'lucide-react-native'

import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { useMembershipUser, useMembershipAuth } from '@/lib/server'
import { deleteAccount, ServerApiError } from '@/lib/server/api'
import { useThemeColors } from '@/lib/theme'
import { DELETION_REASONS, type DeletionReasonCode } from '@anyhunt/api'
import { useTranslation } from '@anyhunt/i18n'
import { SettingsGroup, SettingsSeparator } from '@/components/settings'
import { cn } from '@/lib/utils'

const REASON_TRANSLATION_KEYS: Record<DeletionReasonCode, string> = {
  not_useful: 'deleteReasonNotUseful',
  found_alternative: 'deleteReasonFoundAlternative',
  too_expensive: 'deleteReasonTooExpensive',
  too_complex: 'deleteReasonTooComplex',
  bugs_issues: 'deleteReasonBugsIssues',
  other: 'deleteReasonOther',
}

export default function DeleteAccountScreen() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { user } = useMembershipUser()
  const { logout } = useMembershipAuth()
  const colors = useThemeColors()

  const [selectedReason, setSelectedReason] = React.useState<DeletionReasonCode | null>(null)
  const [feedback, setFeedback] = React.useState('')
  const [confirmation, setConfirmation] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)

  const userEmail = user?.email || ''

  const canDelete = selectedReason !== null && confirmation === userEmail && !isDeleting

  const handleDelete = async () => {
    if (!selectedReason || confirmation !== userEmail) return

    Alert.alert(t('deleteAccountTitle'), t('deleteAccountWarning'), [
      { text: tCommon('cancel'), style: 'cancel' },
      {
        text: t('confirmDeleteAccount'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true)
          try {
            await deleteAccount({
              reason: selectedReason,
              feedback: feedback.trim() || undefined,
              confirmation,
            })

            Alert.alert(tCommon('success'), t('deleteAccountSuccess'), [
              {
                text: tCommon('confirm'),
                onPress: async () => {
                  await logout()
                  router.dismissAll()
                  router.replace('/(auth)/sign-in')
                },
              },
            ])
          } catch (error) {
            const message =
              error instanceof ServerApiError ? error.message : t('deleteAccountError')
            Alert.alert(tCommon('error'), message)
          } finally {
            setIsDeleting(false)
          }
        },
      },
    ])
  }

  return (
    <View className="flex-1 bg-page-background">
      <ScrollView className="flex-1 pt-4 pb-10">
        {/* 警告提示 */}
        <View className="mx-4 mb-6 p-4 rounded-xl bg-destructive/15 flex-row items-start gap-3">
          <Icon as={AlertTriangleIcon} size={20} color={colors.destructive} />
          <Text className="flex-1 text-sm text-destructive leading-5">
            {t('deleteAccountWarning')}
          </Text>
        </View>

        {/* 删除原因选择 */}
        <SettingsGroup title={t('selectDeleteReason')}>
          {DELETION_REASONS.map((reason, index) => {
            const isSelected = selectedReason === reason.code
            const translationKey = REASON_TRANSLATION_KEYS[reason.code]
            return (
              <React.Fragment key={reason.code}>
                {index > 0 && <SettingsSeparator indent={52} />}
                <Pressable
                  onPress={() => setSelectedReason(reason.code)}
                  className="flex-row items-center px-4 py-3 active:bg-surface-pressed"
                >
                  <View
                    className={cn(
                      'w-6 h-6 rounded-full border-2 items-center justify-center mr-3',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && <Icon as={CheckIcon} size={14} color="#FFFFFF" />}
                  </View>
                  <Text
                    className={cn(
                      'flex-1 text-[17px]',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {t(translationKey as never)}
                  </Text>
                </Pressable>
              </React.Fragment>
            )
          })}
        </SettingsGroup>

        {/* 详细反馈 */}
        <SettingsGroup
          title={t('deleteFeedbackPlaceholder')}
          footer={`${feedback.length}/500`}
        >
          <TextInput
            className="min-h-[100px] p-4 text-[17px] text-foreground"
            style={{ textAlignVertical: 'top' }}
            placeholder={t('deleteFeedbackPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            value={feedback}
            onChangeText={setFeedback}
            editable={!isDeleting}
          />
        </SettingsGroup>

        {/* 确认输入 */}
        <SettingsGroup title={t('deleteConfirmationHint')}>
          <TextInput
            className="p-4 text-[17px] text-foreground"
            placeholder={userEmail}
            placeholderTextColor={colors.textTertiary}
            value={confirmation}
            onChangeText={setConfirmation}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isDeleting}
          />
          {confirmation && confirmation !== userEmail && (
            <View className="px-4 pb-3">
              <Text className="text-[13px] text-destructive">
                {t('deleteConfirmationHint')}
              </Text>
            </View>
          )}
        </SettingsGroup>

        {/* 删除按钮 */}
        <View className="mx-4 mt-2">
          <Pressable
            onPress={handleDelete}
            disabled={!canDelete}
            className={cn(
              'bg-destructive rounded-xl py-3.5 items-center justify-center flex-row gap-2',
              !canDelete && 'opacity-50'
            )}
          >
            {isDeleting && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white font-semibold text-base">
              {isDeleting ? t('deleting') : t('confirmDeleteAccount')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}
