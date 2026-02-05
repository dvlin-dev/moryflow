import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { ConversationViewport } from '../src/ai/conversation-viewport';
import { MessageRoot } from '../src/ai/message/root';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

class MutationObserverMock {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (!globalThis.MutationObserver) {
  globalThis.MutationObserver = MutationObserverMock as typeof MutationObserver;
}

describe('MessageRoot', () => {
  it('applies assistant class when from=assistant', () => {
    const { container } = render(
      <ConversationViewport>
        <MessageRoot from="assistant" />
      </ConversationViewport>
    );
    expect(container.querySelector('.is-assistant')).not.toBeNull();
  });

  it('applies user class when from=user', () => {
    const { container } = render(
      <ConversationViewport>
        <MessageRoot from="user" />
      </ConversationViewport>
    );
    expect(container.querySelector('.is-user')).not.toBeNull();
  });
});
