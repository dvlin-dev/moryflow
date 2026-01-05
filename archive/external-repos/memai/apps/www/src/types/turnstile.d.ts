interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

interface Turnstile {
  render: (
    container: string | HTMLElement,
    options: TurnstileRenderOptions
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

export {}
