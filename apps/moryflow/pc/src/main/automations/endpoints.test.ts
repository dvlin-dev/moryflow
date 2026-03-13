/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import type { AutomationEndpoint } from '@moryflow/automations-core';

describe('automation endpoints service', () => {
  it('binds telegram endpoint with canonical thread keys, stable replySessionId and verification message', async () => {
    const saved: AutomationEndpoint[] = [];
    const { createAutomationEndpointsService } = await import('./endpoints.js');
    const service = createAutomationEndpointsService({
      store: {
        saveEndpoint(endpoint: AutomationEndpoint) {
          saved.push(endpoint);
          return endpoint;
        },
        listEndpoints: () => [],
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
        getEndpoint: vi.fn(),
      } as never,
      telegram: {
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: 'telegram:account-1:peer:chat-1',
          threadKey: 'telegram:account-1:peer:chat-1:thread:42',
          conversationId: 'reply-session-1',
        })),
        sendEnvelope: vi.fn(async () => undefined),
      } as never,
      nowIso: () => '2026-03-13T00:00:00.000Z',
      generateId: () => 'endpoint-1',
    });

    const endpoint = await service.bindEndpoint({
      channel: 'telegram',
      accountId: 'account-1',
      chatId: 'chat-1',
      threadId: '42',
      label: 'Finance updates',
    });

    expect(endpoint.replySessionId).toBe('reply-session-1');
    expect(endpoint.target.peerKey).toBe('telegram:account-1:peer:chat-1');
    expect(endpoint.target.threadKey).toBe('telegram:account-1:peer:chat-1:thread:42');
    expect(endpoint.verifiedAt).toBe('2026-03-13T00:00:00.000Z');
    expect(saved).toHaveLength(1);
  });

  it('persists endpoint as unverified when verification send fails', async () => {
    const { createAutomationEndpointsService } = await import('./endpoints.js');
    const service = createAutomationEndpointsService({
      store: {
        saveEndpoint: (endpoint: AutomationEndpoint) => endpoint,
        listEndpoints: () => [],
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
        getEndpoint: vi.fn(),
      } as never,
      telegram: {
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: 'telegram:account-1:peer:chat-1',
          threadKey: 'telegram:account-1:peer:chat-1:thread:root',
          conversationId: 'reply-session-2',
        })),
        sendEnvelope: vi.fn(async () => {
          throw new Error('send failed');
        }),
      } as never,
      nowIso: () => '2026-03-13T00:00:00.000Z',
      generateId: () => 'endpoint-2',
    });

    const endpoint = await service.bindEndpoint({
      channel: 'telegram',
      accountId: 'account-1',
      chatId: 'chat-1',
      label: 'Broken endpoint',
    });

    expect(endpoint.verifiedAt).toBeUndefined();
  });

  it('reuses existing endpoint id for the same canonical telegram thread', async () => {
    const existing: AutomationEndpoint = {
      id: 'endpoint-existing',
      channel: 'telegram',
      accountId: 'account-1',
      label: 'Old label',
      target: {
        kind: 'telegram',
        chatId: 'chat-1',
        threadId: '42',
        peerKey: 'telegram:account-1:peer:chat-1',
        threadKey: 'telegram:account-1:peer:chat-1:thread:42',
      },
      verifiedAt: '2026-03-12T00:00:00.000Z',
      replySessionId: 'reply-session-1',
    };
    const saveEndpoint = vi.fn((endpoint: AutomationEndpoint) => endpoint);
    const { createAutomationEndpointsService } = await import('./endpoints.js');
    const service = createAutomationEndpointsService({
      store: {
        saveEndpoint,
        listEndpoints: () => [existing],
        removeEndpoint: vi.fn(),
        setDefaultEndpoint: vi.fn(),
        getEndpoint: vi.fn(),
      } as never,
      telegram: {
        ensureReplyConversation: vi.fn(async () => ({
          peerKey: existing.target.peerKey,
          threadKey: existing.target.threadKey,
          conversationId: 'reply-session-1',
        })),
        sendEnvelope: vi.fn(async () => undefined),
      } as never,
      generateId: () => 'endpoint-new',
    });

    const endpoint = await service.bindEndpoint({
      channel: 'telegram',
      accountId: 'account-1',
      chatId: 'chat-1',
      threadId: '42',
      label: 'Fresh label',
    });

    expect(endpoint.id).toBe('endpoint-existing');
    expect(saveEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'endpoint-existing',
        label: 'Fresh label',
      })
    );
  });
});
