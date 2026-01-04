import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { useMembershipAuth, validateEmail, validatePassword } from '@/lib/server'
import { Link, router } from 'expo-router'
import * as React from 'react'
import { type TextInput, View, ActivityIndicator } from 'react-native'
import { useTranslation } from '@/lib/i18n'

export function SignInForm() {
  const { t } = useTranslation('auth')
  const { login, isLoading } = useMembershipAuth()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [localError, setLocalError] = React.useState<{ email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const passwordInputRef = React.useRef<TextInput>(null)

  const clearError = () => setLocalError({})

  async function onSubmit() {
    clearError()

    // 验证邮箱
    if (!email) {
      setLocalError({ email: t('emailRequired') })
      return
    }

    if (!validateEmail(email)) {
      setLocalError({ email: t('emailInvalid') })
      return
    }

    // 验证密码
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setLocalError({ password: t('passwordTooShort') })
      return
    }

    setIsSubmitting(true)
    try {
      await login(email, password)

      // 登录成功后导航
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('signInFailed')
      setLocalError({ password: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus()
  }

  const isButtonDisabled = isSubmitting || isLoading || !email || !password

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">
            {t('signInToMoryFlow')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('welcomeBack')}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  clearError()
                }}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
                editable={!isSubmitting}
              />
              {localError.email ? (
                <Text className="text-sm font-medium text-destructive">{localError.email}</Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">{t('password')}</Label>
                <Link asChild href={`/(auth)/forgot-password?email=${email}`}>
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-auto h-4 px-1 py-0 web:h-fit sm:h-4"
                    disabled={isSubmitting}
                  >
                    <Text className="font-normal leading-4">{t('forgotPassword')}</Text>
                  </Button>
                </Link>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                placeholder={t('enterPassword')}
                autoComplete="password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  clearError()
                }}
                onSubmitEditing={onSubmit}
                returnKeyType="done"
                submitBehavior="submit"
                editable={!isSubmitting}
              />
              {localError.password ? (
                <Text className="text-sm font-medium text-destructive">{localError.password}</Text>
              ) : null}
            </View>
          </View>

          <Button onPress={onSubmit} disabled={isButtonDisabled} className="web:w-full">
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="font-semibold">{t('signIn')}</Text>
            )}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-muted-foreground">{t('noAccount')}</Text>
            <Link asChild href="/(auth)/sign-up">
              <Button variant="link" size="sm" className="h-4 px-1 py-0 web:h-fit sm:h-4">
                <Text>{t('signUp')}</Text>
              </Button>
            </Link>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
