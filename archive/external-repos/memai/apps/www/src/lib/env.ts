export interface PublicEnv {
  apiUrl: string
  turnstileSiteKey: string
}

/**
 * Get public environment variables (server-side only)
 * This should only be called from route loaders
 */
export function getPublicEnv(): PublicEnv {
  return {
    apiUrl: process.env.API_URL || 'https://server.memai.dev',
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
  }
}
