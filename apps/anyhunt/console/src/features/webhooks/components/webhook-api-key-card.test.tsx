import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebhookApiKeyCard } from './webhook-api-key-card';

describe('WebhookApiKeyCard', () => {
  it('没有 active key 时提示创建 key，而不是 rotate', () => {
    render(
      <WebhookApiKeyCard
        activeKeys={[]}
        effectiveKeyId=""
        apiKeyDisplay=""
        hasUsableKey={false}
        isLoadingKeys={false}
        onKeyChange={vi.fn()}
      />
    );

    expect(screen.getByText(/create an active key/i)).toBeInTheDocument();
    expect(screen.queryByText(/rotate it first/i)).not.toBeInTheDocument();
  }, 15_000);

  it('有 active key 但没有本地明文时提示 rotate key', () => {
    render(
      <WebhookApiKeyCard
        activeKeys={[
          {
            id: 'key_1',
            name: 'Primary key',
            keyPreview: 'ah_1234...abcd',
            plainKey: null,
            createdAt: '2026-03-06T00:00:00.000Z',
            expiresAt: null,
            lastUsedAt: null,
            isActive: true,
          },
        ]}
        effectiveKeyId="key_1"
        apiKeyDisplay="ah_1234...abcd"
        hasUsableKey={false}
        isLoadingKeys={false}
        onKeyChange={vi.fn()}
      />
    );

    expect(screen.getByText(/rotate it first/i)).toBeInTheDocument();
  }, 15_000);
});
