import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@moryflow/ui/components/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@moryflow/ui/components/field'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@moryflow/ui/components/input-otp'
import { emailOtp } from '@/lib/server/client'
import { preRegisterApi } from '@/lib/server'

interface OTPFormProps extends React.ComponentProps<'div'> {
  email: string
  /**
   * 验证模式
   * - 'pre-register': 预注册验证，验证成功后创建账号并登录
   * - 'email-verification': 邮箱验证，仅验证邮箱（默认）
   */
  mode?: 'pre-register' | 'email-verification'
  onSuccess?: () => void
  onBack?: () => void
}

const RESEND_COOLDOWN = 60

export function OTPForm({ className, email, mode = 'email-verification', onSuccess, onBack, ...props }: OTPFormProps) {
  const { t } = useTranslation('auth')
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
      setError(t('enterFullOtp'))
      return
    }

    setError(null)
    setIsVerifying(true)

    try {
      if (mode === 'pre-register') {
        // 预注册模式：验证 OTP 并创建账号
        await preRegisterApi.verify({ email, otp })
        onSuccess?.()
      } else {
        // 邮箱验证模式：仅验证邮箱
        const { error: verifyError } = await emailOtp.verifyEmail({
          email,
          otp,
        })

        if (verifyError) {
          setError(verifyError.message || t('otpError'))
          return
        }

        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verifyFailed'))
    } finally {
      setIsVerifying(false)
    }
  }

  // 重发验证码（仅邮箱验证模式支持）
  async function handleResend() {
    // 预注册模式不支持重发，需要返回上一步重新填写信息
    if (mode === 'pre-register') {
      onBack?.()
      return
    }

    setIsResending(true)
    setError(null)

    try {
      const { error: sendError } = await emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })

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

  // 预注册模式不支持倒计时后重发
  const canResend = mode !== 'pre-register' && countdown <= 0 && !isResending

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">{t('verifyEmail')}</h1>
            <FieldDescription>
              {t('otpSentToEmail')} <span className="font-medium text-foreground">{email}</span>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="otp" className="sr-only">
              {t('verificationCodeLabel')}
            </FieldLabel>
            <InputOTP
              maxLength={6}
              id="otp"
              value={otp}
              onChange={setOtp}
              disabled={isVerifying}
              containerClassName="gap-4"
            >
              <InputOTPGroup className="gap-2.5 data-[slot=input-otp-slot]:*:h-16 data-[slot=input-otp-slot]:*:w-12 data-[slot=input-otp-slot]:*:rounded-md data-[slot=input-otp-slot]:*:border data-[slot=input-otp-slot]:*:text-xl">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2.5 data-[slot=input-otp-slot]:*:h-16 data-[slot=input-otp-slot]:*:w-12 data-[slot=input-otp-slot]:*:rounded-md data-[slot=input-otp-slot]:*:border data-[slot=input-otp-slot]:*:text-xl">
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {error && <p className="text-center text-sm text-destructive">{error}</p>}
            <FieldDescription className="text-center">
              {mode === 'pre-register' ? (
                // 预注册模式：提示返回重新发送
                <>
                  {t('noCodeQuestion')}{' '}
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t('backAndResend')}
                  </button>
                </>
              ) : (
                // 邮箱验证模式：倒计时后可重发
                <>
                  {t('noCodeQuestion')}{' '}
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {isResending ? t('sendingOtp') : t('resendOtp')}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">{t('resendInSeconds', { seconds: countdown })}</span>
                  )}
                </>
              )}
            </FieldDescription>
          </Field>
          <Field>
            <Button type="button" onClick={handleVerify} disabled={isVerifying || otp.length !== 6}>
              {isVerifying && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('verifyButton')}
            </Button>
          </Field>
          {onBack && (
            <Field>
              <Button type="button" variant="ghost" onClick={onBack}>
                {t('backButton')}
              </Button>
            </Field>
          )}
        </FieldGroup>
      </div>
    </div>
  )
}
