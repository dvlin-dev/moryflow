import { getMoryflowDeepLinkScheme } from '../auth-oauth.js';

const DESKTOP_APP_PLATFORM = 'desktop';

export const getMembershipRequestOrigin = (): string => {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL?.trim();

  if (rendererUrl) {
    try {
      return new URL(rendererUrl).origin;
    } catch {
      // Fallback to the packaged deep-link origin when dev renderer URL is invalid.
    }
  }

  return `${getMoryflowDeepLinkScheme()}://`;
};

export const createMembershipAuthHeaders = (): Record<string, string> => ({
  'X-App-Platform': DESKTOP_APP_PLATFORM,
  Origin: getMembershipRequestOrigin(),
});
