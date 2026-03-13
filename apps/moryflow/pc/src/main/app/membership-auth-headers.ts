const DESKTOP_APP_PLATFORM = 'desktop';

export const createMembershipDeviceAuthHeaders = (): Record<string, string> => ({
  'X-App-Platform': DESKTOP_APP_PLATFORM,
});
