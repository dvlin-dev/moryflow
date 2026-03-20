import { describe, expect, it, vi } from 'vitest';

import { createDeepLinkController } from './deep-link-controller.js';

describe('createDeepLinkController', () => {
  it('queues deep links until delivery becomes available and flushes later', () => {
    let deliverable = false;
    const deliverOAuthCallback = vi.fn();
    const deliverPaymentSuccess = vi.fn();
    const focusPrimaryWindow = vi.fn();

    const controller = createDeepLinkController({
      canDeliver: () => deliverable,
      focusPrimaryWindow,
      deliverOAuthCallback,
      deliverPaymentSuccess,
      parseOAuthCallbackDeepLink: (url) =>
        url.includes('code=oauth-code') ? { code: 'oauth-code', nonce: 'oauth-nonce' } : null,
      redactDeepLinkForLog: (url) => url,
    });

    controller.handleDeepLink('moryflow://auth/success?code=oauth-code&nonce=oauth-nonce');
    expect(deliverOAuthCallback).not.toHaveBeenCalled();

    deliverable = true;
    controller.flushPendingDeepLinks();

    expect(deliverOAuthCallback).toHaveBeenCalledWith({
      code: 'oauth-code',
      nonce: 'oauth-nonce',
    });
    expect(focusPrimaryWindow).toHaveBeenCalledTimes(1);
    expect(deliverPaymentSuccess).not.toHaveBeenCalled();
  });

  it('broadcasts payment success when receiving payment callback', () => {
    const deliverPaymentSuccess = vi.fn();
    const focusPrimaryWindow = vi.fn();

    const controller = createDeepLinkController({
      canDeliver: () => true,
      focusPrimaryWindow,
      deliverOAuthCallback: vi.fn(),
      deliverPaymentSuccess,
      parseOAuthCallbackDeepLink: () => null,
      redactDeepLinkForLog: (url) => url,
    });

    controller.handleDeepLink('moryflow://payment/success');

    expect(deliverPaymentSuccess).toHaveBeenCalledTimes(1);
    expect(focusPrimaryWindow).toHaveBeenCalledTimes(1);
  });
});
