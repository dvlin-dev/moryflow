/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexCompositionMocks = vi.hoisted(() => ({
  createAgentRuntime: vi.fn(),
}));

vi.mock('./runtime/runtime-factory.js', () => ({
  createAgentRuntime: indexCompositionMocks.createAgentRuntime,
}));

vi.mock('./session/chat-session.js', () => ({
  createChatSession: vi.fn(),
}));

vi.mock('./runtime/runtime-vault-context.js', () => ({
  runWithRuntimeVaultRoot: vi.fn(),
}));

import { createAgentRuntime } from './index.js';

describe('agent-runtime index composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates createAgentRuntime to the runtime composition module', () => {
    const runtime = { runChatTurn: vi.fn() };
    indexCompositionMocks.createAgentRuntime.mockReturnValue(runtime);

    expect(createAgentRuntime()).toBe(runtime);
    expect(indexCompositionMocks.createAgentRuntime).toHaveBeenCalledTimes(1);
  });
});
