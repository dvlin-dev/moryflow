declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string
      NODE_ENV: 'development' | 'production' | 'test'

      EXPO_PUBLIC_URL: string
      NEXT_PUBLIC_URL: string
    }
  }
}

export {}
