export const createDeepLinkController = (input: {
  canDeliver: () => boolean;
  focusPrimaryWindow: () => void;
  deliverOAuthCallback: (payload: { code: string; nonce: string }) => void;
  deliverPaymentSuccess: () => void;
  parseOAuthCallbackDeepLink: (rawUrl: string) => { code: string; nonce: string } | null;
  redactDeepLinkForLog: (rawUrl: string) => string;
}) => {
  const pendingUrls: string[] = [];

  const handleDeepLink = (url: string) => {
    if (!input.canDeliver()) {
      pendingUrls.push(url);
      return;
    }

    console.log('[deep-link] received:', input.redactDeepLinkForLog(url));

    const oauthPayload = input.parseOAuthCallbackDeepLink(url);
    if (oauthPayload) {
      input.deliverOAuthCallback(oauthPayload);
      input.focusPrimaryWindow();
      return;
    }

    try {
      const parsed = new URL(url);
      const routePath = parsed.pathname.replace(/^\/+/, '');

      if (parsed.host === 'payment' && routePath === 'success') {
        console.log('[deep-link] payment success callback');
        input.deliverPaymentSuccess();
        input.focusPrimaryWindow();
      }
    } catch (error) {
      console.error('[deep-link] failed to parse URL:', error);
    }
  };

  const flushPendingDeepLinks = () => {
    if (pendingUrls.length === 0 || !input.canDeliver()) {
      return;
    }
    const urls = pendingUrls.splice(0, pendingUrls.length);
    for (const url of urls) {
      handleDeepLink(url);
    }
  };

  return {
    handleDeepLink,
    flushPendingDeepLinks,
  };
};
