import { useState, useCallback, useRef, useEffect } from 'react'
import { checkVerifyStatus, ApiError } from '@/lib/api'
import type { TurnstileRef } from '@/components/playground/Turnstile'

interface UseCaptchaVerificationOptions {
  apiUrl: string
  turnstileSiteKey?: string
}

interface UseCaptchaVerificationReturn {
  /** 是否已通过 IP 验证（服务端记录） */
  isVerified: boolean
  /** 是否正在检查验证状态 */
  checkingStatus: boolean
  /** 当前 captcha token */
  captchaToken: string | null
  /** Turnstile 组件的 ref */
  turnstileRef: React.RefObject<TurnstileRef | null>
  /** 是否可以提交（已验证或有 token） */
  canSubmit: boolean
  /** 获取用于 API 调用的 token（已验证返回 null，否则返回 captchaToken） */
  getTokenForRequest: () => string | null
  /** Turnstile onSuccess 回调 */
  handleCaptchaSuccess: (token: string) => void
  /** Turnstile onError 回调 */
  handleCaptchaError: () => void
  /** Turnstile onExpire 回调 */
  handleCaptchaExpire: () => void
  /** 标记为已验证（API 调用成功后调用） */
  markAsVerified: () => void
  /** 处理 API 错误，如果是 CAPTCHA_REQUIRED 则重置状态 */
  handleApiError: (error: unknown) => void
  /** 是否需要显示 Turnstile 组件 */
  shouldShowTurnstile: boolean
}

/**
 * 验证码验证 Hook
 * 封装 Turnstile 验证和 IP 验证状态管理
 */
export function useCaptchaVerification({
  apiUrl,
  turnstileSiteKey,
}: UseCaptchaVerificationOptions): UseCaptchaVerificationReturn {
  const [isVerified, setIsVerified] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileRef>(null)

  // 页面加载时检查验证状态
  useEffect(() => {
    checkVerifyStatus(apiUrl)
      .then(({ verified }) => {
        setIsVerified(verified)
      })
      .finally(() => {
        setCheckingStatus(false)
      })
  }, [apiUrl])

  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const markAsVerified = useCallback(() => {
    setIsVerified(true)
  }, [])

  const handleApiError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.code === 'CAPTCHA_REQUIRED') {
      setIsVerified(false)
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    }
  }, [])

  const getTokenForRequest = useCallback(() => {
    return isVerified ? null : captchaToken
  }, [isVerified, captchaToken])

  const canSubmit = (isVerified || !!captchaToken) && !checkingStatus
  const shouldShowTurnstile = !!turnstileSiteKey && !isVerified && !checkingStatus

  return {
    isVerified,
    checkingStatus,
    captchaToken,
    turnstileRef,
    canSubmit,
    getTokenForRequest,
    handleCaptchaSuccess,
    handleCaptchaError,
    handleCaptchaExpire,
    markAsVerified,
    handleApiError,
    shouldShowTurnstile,
  }
}
