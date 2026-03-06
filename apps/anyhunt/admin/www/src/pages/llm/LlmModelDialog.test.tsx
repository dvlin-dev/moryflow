import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { LlmProviderListItem } from '@/features/llm';
import { LlmModelDialog } from './LlmModelDialog';

describe('LlmModelDialog', () => {
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const previousResizeObserver = globalThis.ResizeObserver;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver =
      globalThis.ResizeObserver ??
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  });

  afterAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    globalThis.ResizeObserver = previousResizeObserver;
  });

  it('renders create dialog without form field context errors', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const providers: LlmProviderListItem[] = [
      {
        id: 'provider-1',
        providerType: 'openai',
        name: 'OpenAI',
        baseUrl: null,
        enabled: true,
        sortOrder: 0,
        apiKeyStatus: 'set',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];

    const onClose = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    let renderError: unknown;

    try {
      act(() => {
        root.render(
          <LlmModelDialog
            viewModel={{
              open: true,
              mode: 'create',
              model: null,
              providers,
              isSubmitting: false,
            }}
            actions={{
              onClose,
              onCreate,
              onUpdate,
            }}
          />
        );
      });
    } catch (error) {
      renderError = error;
    }

    expect(renderError).toBeUndefined();

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
