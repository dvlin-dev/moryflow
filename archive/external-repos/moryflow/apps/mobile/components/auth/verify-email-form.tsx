import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { sendVerificationOTP, verifyEmailOTP } from '@/lib/server/auth-api'
import { preRegisterApi, useMembership } from '@/lib/server'
import { router, useLocalSearchParams } from 'expo-router'
import * as React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useTranslation } from '@/lib/i18n'

const RESEND_COOLDOWN = 60

/**
 * [PROPS]: useLocalSearchParams - email, mode ('signin' | 'signup' | 'pre-register')
 * [EMITS]: 验证成功后刷新用户状态并跳转首页
 * [POS]: 邮箱验证码表单，支持登录验证、注册验证、预注册验证三种模式
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
export function VerifyEmailForm() {
  const { t } = useTranslation('auth')
  const { refresh } = useMembership()
  const params = useLocalSearchParams<{
    email?: string
    mode?: 'signin' | 'signup' | 'pre-register'
  }>()

  const email = params.email || ''
  const mode = params.mode || 'signup'
  const isPreRegister = mode === 'pre-register'

  const [otp, setOtp] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [isResending, setIsResending] = React.useState(false)
  const [countdown, setCountdown] = React.useState(RESEND_COOLDOWN)

  // 倒计时
  React.useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // 验证 OTP
  async function handleVerify() {
    if (otp.length !== 6) {
      setError(t('enterSixDigitCode'))
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      // 预注册模式：验证 OTP 并完成注册
      if (isPreRegister) {
        const { error: verifyError } = await preRegisterApi.verify({ email, otp })

        if (verifyError) {
          setError(verifyError.message || t('codeInvalid'))
          return
        }

        // 注册成功，刷新用户状态后跳转首页
        await refresh()
        router.replace('/')
        return
      }

      // 常规模式：验证邮箱 OTP
      const { error: verifyError } = await verifyEmailOTP(email, otp)

      if (verifyError) {
        setError(verifyError.message || t('codeInvalid'))
        return
      }

      // 验证成功，刷新用户状态后跳转首页
      await refresh()
      router.replace('/')
    } catch {
      setError(`${t('verificationFailed')}, ${t('pleaseRetry')}`)
    } finally {
      setIsVerifying(false)
    }
  }

  // 重发验证码
  async function handleResend() {
    setIsResending(true)
    setError(null)

    try {
      const { error: sendError } = await sendVerificationOTP(email, 'email-verification')

      if (sendError) {
        setError(sendError.message || t('sendFailed'))
        return
      }

      setCountdown(RESEND_COOLDOWN)
    } catch {
      setError(t('sendFailedRetry'))
    } finally {
      setIsResending(false)
    }
  }

  const canResend = countdown <= 0 && !isResending

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">
            {t('verifyEmailTitle')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            {t('verificationCodeSentTo', { email: email || t('email') })}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-4">
            <Input
              placeholder={t('enterSixDigitCode')}
              value={otp}
              onChangeText={(text) => {
                // 只允许输入数字，最多 6 位
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6)
                setOtp(cleaned)
                setError(null)
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isVerifying}
              className="text-center text-2xl tracking-[0.5em]"
            />

            {error && <Text className="text-center text-sm text-destructive">{error}</Text>}

            {/* 预注册模式：显示返回重新发送；常规模式：显示倒计时重发 */}
            {isPreRegister ? (
              <Text className="text-center text-sm text-muted-foreground">
                {t('noCodeReceived')}{' '}
                <Text onPress={() => router.back()} className="text-primary">
                  {t('backAndResend')}
                </Text>
              </Text>
            ) : (
              <Text className="text-center text-sm text-muted-foreground">
                {t('noCodeReceived')}{' '}
                {canResend ? (
                  <Text onPress={handleResend} className="text-primary">
                    {isResending ? t('sending') : t('resendCode')}
                  </Text>
                ) : (
                  <Text>{t('canResendIn', { seconds: countdown })}</Text>
                )}
              </Text>
            )}

            <Button
              onPress={handleVerify}
              disabled={isVerifying || otp.length !== 6}
              className="w-full"
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="font-semibold">{t('verify')}</Text>
              )}
            </Button>

            <Button variant="outline" onPress={() => router.back()} className="w-full">
              <Text className="font-semibold">
                {t('backTo', { mode: mode === 'signup' ? t('signUp') : t('signIn') })}
              </Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
