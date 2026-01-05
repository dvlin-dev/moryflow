import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { validateEmail, validatePassword, PASSWORD_CONFIG, preRegisterApi } from '@/lib/server'
import { Link, router, useLocalSearchParams } from 'expo-router'
import * as React from 'react'
import { TextInput, View, ActivityIndicator } from 'react-native'
import { useTranslation } from '@/lib/i18n'

export function SignUpForm() {
  const { t } = useTranslation('auth')
  const { t: tValidation } = useTranslation('validation')

  const params = useLocalSearchParams()
  const [email, setEmail] = React.useState((params.email as string) || '')
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [localError, setLocalError] = React.useState<{ email?: string; name?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const nameInputRef = React.useRef<TextInput>(null)
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

    // 验证昵称
    if (!name.trim()) {
      setLocalError({ name: t('nicknameRequired') })
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
      // 预注册流程：发送验证码到邮箱
      const { error } = await preRegisterApi.sendOtp({ email, name: name.trim(), password })
      if (error) {
        setLocalError({ email: error.message })
        return
      }
      // 发送成功后跳转到验证页面
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email, mode: 'pre-register' },
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code'
      setLocalError({ email: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  function onEmailSubmitEditing() {
    nameInputRef.current?.focus()
  }

  function onNameSubmitEditing() {
    passwordInputRef.current?.focus()
  }

  const isButtonDisabled = isSubmitting || !email || !name.trim() || !password

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">{t('createAccount')}</CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('signUpWelcome')}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                placeholder={t('emailPlaceholder')}
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
              <Label htmlFor="name">{t('nickname')}</Label>
              <Input
                ref={nameInputRef}
                id="name"
                placeholder={t('nicknamePlaceholder')}
                autoComplete="name"
                autoCapitalize="words"
                value={name}
                onChangeText={(text) => {
                  setName(text)
                  clearError()
                }}
                onSubmitEditing={onNameSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
                editable={!isSubmitting}
              />
              {localError.name ? (
                <Text className="text-sm font-medium text-destructive">{localError.name}</Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                placeholder={t('createPassword')}
                autoComplete="password-new"
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  clearError()
                }}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                submitBehavior="submit"
                editable={!isSubmitting}
              />
              {localError.password ? (
                <Text className="text-sm font-medium text-destructive">{localError.password}</Text>
              ) : null}
              <Text className="text-xs text-muted-foreground">
                {tValidation('passwordMinLength', { min: PASSWORD_CONFIG.MIN_LENGTH })}
              </Text>
            </View>
          </View>

          <Button onPress={onSubmit} disabled={isButtonDisabled} className="web:w-full">
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="font-semibold">{t('createAccountButton')}</Text>
            )}
          </Button>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-muted-foreground">{t('alreadyHaveAccount')}</Text>
            <Link asChild href="/(auth)/sign-in">
              <Button variant="link" size="sm" className="h-4 px-1 py-0 web:h-fit sm:h-4">
                <Text>{t('signIn')}</Text>
              </Button>
            </Link>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
