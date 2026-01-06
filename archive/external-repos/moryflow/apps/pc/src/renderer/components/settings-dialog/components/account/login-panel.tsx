import { useState } from 'react'
import { Button } from '@moryflow/ui/components/button'
import { Input } from '@moryflow/ui/components/input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@moryflow/ui/components/field'
import { Loader2 } from 'lucide-react'
import { useAuth, preRegisterApi } from '@/lib/server'
import { OTPForm } from '@/components/auth'
import { useTranslation } from '@/lib/i18n'

type LoginPanelProps = {
  onSuccess?: () => void
}

/**
 * 登录面板组件
 * 支持邮箱密码登录和注册（预注册验证流程）
 */
export const LoginPanel = ({ onSuccess }: LoginPanelProps) => {
  const { t } = useTranslation('auth')
  const { login, isLoading, refresh } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  // 是否显示验证码输入
  const [showOTP, setShowOTP] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)

    try {
      if (mode === 'login') {
        await login(email, password)
        onSuccess?.()
      } else {
        // 预注册流程：发送验证码到邮箱
        setIsSendingOtp(true)
        await preRegisterApi.sendOtp({ email, password, name })
        setShowOTP(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('operationFailed'))
    } finally {
      setIsSendingOtp(false)
    }
  }

  // 验证码验证成功
  const handleOTPSuccess = async () => {
    await refresh()
    onSuccess?.()
  }

  // 返回注册表单
  const handleOTPBack = () => {
    setShowOTP(false)
  }

  const isFormValid = email.trim() && password.trim() && (mode === 'login' || name.trim())

  const isSubmitting = isLoading || isSendingOtp

  // 显示验证码输入
  if (showOTP) {
    return (
      <div className="mx-auto max-w-md">
        <OTPForm email={email} mode="pre-register" onSuccess={handleOTPSuccess} onBack={handleOTPBack} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium">
          {mode === 'login' ? t('welcomeBackTitle') : t('createAccountTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'login'
            ? t('signInToCloudService')
            : t('signUpToMoryflow')}
        </p>
      </div>

      <div>
        <FieldGroup>
          {/* OAuth 登录按钮 - 暂时禁用 */}
          <Field>
            <Button variant="outline" type="button" disabled className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                  fill="currentColor"
                />
              </svg>
              {t('appleSignInComingSoon')}
            </Button>
            <Button variant="outline" type="button" disabled className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              {t('googleSignInComingSoon')}
            </Button>
          </Field>

          <FieldSeparator>{t('orUseEmail')}</FieldSeparator>

          {mode === 'register' && (
            <Field>
              <FieldLabel htmlFor="name">{t('nickname')}</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder={t('nicknamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
              {mode === 'login' && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled
                >
                  {t('forgotPasswordComingSoon')}
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Field>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !isFormValid} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? t('signIn') : t('signUp')}
            </Button>
            <FieldDescription className="text-center">
              {mode === 'login' ? (
                <>
                  {t('noAccountQuestion')}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setMode('register')}
                  >
                    {t('signUpNow')}
                  </button>
                </>
              ) : (
                <>
                  {t('haveAccountQuestion')}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setMode('login')}
                  >
                    {t('backToSignInAction')}
                  </button>
                </>
              )}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('agreeToTerms')}{' '}
        <a href="#" className="hover:underline">{t('termsOfService')}</a>
        {' '}{t('and')}{' '}
        <a href="#" className="hover:underline">{t('privacyPolicyLink')}</a>
      </p>
    </div>
  )
}
