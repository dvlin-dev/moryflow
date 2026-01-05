import { useState, useCallback, useRef } from 'react'
import { QueryInput } from './QueryInput'
import { PresetButtons } from './PresetButtons'
import { SearchResults } from './SearchResults'
import { StatsBar } from './StatsBar'
import { Turnstile, type TurnstileRef } from './Turnstile'
import { searchMemories, type SearchResponse } from '@/lib/api'
import { usePublicEnv } from '@/routes/__root'

export function QuickPlayground() {
  const { turnstileSiteKey, apiUrl } = usePublicEnv()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResponse | null>(null)

  // Turnstile ref 和 token 状态
  const turnstileRef = useRef<TurnstileRef>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const executeSearch = useCallback(
    async (query: string, token: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await searchMemories(query, token, apiUrl)
        setResult(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to search memories'
        )
        setResult(null)
      } finally {
        setIsLoading(false)
        // 搜索完成后（无论成功或失败）重置 Turnstile 以获取新 token
        setCaptchaToken(null)
        turnstileRef.current?.reset()
      }
    },
    [apiUrl]
  )

  const handleSearch = useCallback(
    (query: string) => {
      if (!turnstileSiteKey) {
        setError('Captcha not configured')
        return
      }

      if (!captchaToken) {
        return
      }

      executeSearch(query, captchaToken)
    },
    [captchaToken, executeSearch, turnstileSiteKey]
  )

  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaError = useCallback(() => {
    setError('Captcha verification failed')
    setCaptchaToken(null)
  }, [])

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const canSubmit = !!captchaToken && !isLoading

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Query Input */}
      <QueryInput
        onSubmit={handleSearch}
        isLoading={isLoading}
        disabled={!canSubmit}
      />

      {/* Preset Buttons */}
      <PresetButtons
        onSelect={handleSearch}
        isLoading={isLoading}
        disabled={!canSubmit}
      />

      {/* Turnstile 验证 */}
      {turnstileSiteKey && (
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onSuccess={handleCaptchaSuccess}
          onError={handleCaptchaError}
          onExpire={handleCaptchaExpire}
        />
      )}

      {/* 验证状态提示 */}
      {turnstileSiteKey && (
        <div className="text-center text-sm">
          {captchaToken ? (
            <span className="text-green-600">Verified - Ready to search</span>
          ) : (
            <span className="text-gray-500">
              Complete the verification above to enable search
            </span>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <StatsBar
        searchTime={result?.searchTime ?? null}
        totalFound={result?.totalFound ?? null}
      />

      {/* Search Results */}
      <SearchResults
        isLoading={isLoading}
        error={error}
        results={result?.results ?? null}
      />
    </div>
  )
}
