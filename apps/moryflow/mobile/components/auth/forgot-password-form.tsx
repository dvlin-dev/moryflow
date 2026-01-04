import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { validateEmail } from '@/lib/server'
import { router, useLocalSearchParams } from 'expo-router'
import * as React from 'react'
import { View, Alert } from 'react-native'
import { useTranslation } from '@/lib/i18n'

export function ForgotPasswordForm() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const { email: emailParam = '' } = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = React.useState(emailParam)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<{ email?: string }>({})

  const onSubmit = async () => {
    setError({})

    if (!email) {
      setError({ email: t('emailRequired') })
      return
    }

    if (!validateEmail(email)) {
      setError({ email: t('emailInvalid') })
      return
    }

    setIsLoading(true)

    try {
      // TODO: 调用 Better Auth 的密码重置 API
      Alert.alert('重置链接已发送', '请检查您的邮箱', [
        { text: tCommon('confirm'), onPress: () => router.back() },
      ])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('failedToSendCode')
      setError({ email: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">
            {t('forgotPassword')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('forgotPasswordPageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                value={email}
                placeholder={t('emailPlaceholder')}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={(text) => {
                  setEmail(text)
                  setError({})
                }}
                onSubmitEditing={onSubmit}
                returnKeyType="send"
                editable={!isLoading}
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>

            <Button className="w-full" onPress={onSubmit} disabled={isLoading || !email}>
              <Text className="font-semibold">{t('sendVerificationCode')}</Text>
            </Button>

            <View className="flex-row items-center justify-center gap-1">
              <Button
                variant="link"
                size="sm"
                className="h-4 px-1 py-0"
                onPress={() => router.back()}
              >
                <Text>{t('backToSignIn')}</Text>
              </Button>
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
