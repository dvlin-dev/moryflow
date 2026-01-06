import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TURNSTILE_SCRIPT_ID = 'turnstile-script'

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
}

export interface TurnstileRef {
  reset: () => void
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  function Turnstile({ siteKey, onSuccess, onError, onExpire }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // 暴露 reset 方法给父组件
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }))

    useEffect(() => {
      let mounted = true

      const loadAndRender = async () => {
        // Load script if not already loaded
        if (!window.turnstile) {
          // 检查是否已经有脚本标签
          const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID)
          if (!existingScript) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script')
              script.id = TURNSTILE_SCRIPT_ID
              script.src = TURNSTILE_SCRIPT_URL
              script.async = true
              script.onload = () => resolve()
              script.onerror = () => reject(new Error('Failed to load Turnstile'))
              document.head.appendChild(script)
            })
          } else {
            // 脚本已存在，等待加载完成
            await new Promise<void>((resolve) => {
              const checkInterval = setInterval(() => {
                if (window.turnstile) {
                  clearInterval(checkInterval)
                  resolve()
                }
              }, 50)
            })
          }
        }

        if (!mounted || !containerRef.current || !window.turnstile) return

        setIsLoading(false)

        // Render widget
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onSuccess,
          'error-callback': onError,
          'expired-callback': onExpire,
          theme: 'light',
        })
      }

      loadAndRender().catch(() => {
        if (mounted) {
          setIsLoading(false)
          onError?.()
        }
      })

      return () => {
        mounted = false
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
        }
      }
    }, [siteKey, onSuccess, onError, onExpire])

    return (
      <div className="flex items-center justify-center py-2">
        {isLoading && (
          <div className="text-sm text-gray-500">Loading verification...</div>
        )}
        <div ref={containerRef} />
      </div>
    )
  }
)
