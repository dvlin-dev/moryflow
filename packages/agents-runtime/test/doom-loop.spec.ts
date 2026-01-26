import { describe, expect, it } from 'vitest';
import type { RunContext } from '@openai/agents-core';

import { createDoomLoopGuard } from '../src/doom-loop';
import type { AgentContext } from '../src/types';

describe('doom-loop', () => {
  it('requests approval when the same tool repeats beyond the threshold', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 3,
        maxToolCalls: 10,
        maxAttempts: 2,
        cooldownToolCalls: 1,
        maxSignatureBytes: 1024,
      },
    });
    const runContext = {
      context: { chatId: 'chat-1', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const first = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-1',
    });
    const second = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-2',
    });
    const third = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-3',
    });

    expect(first.action).toBe('allow');
    expect(second.action).toBe('allow');
    expect(third.action).toBe('ask');
  });

  it('auto-approves when session is set to always', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 2,
        maxToolCalls: 10,
        maxAttempts: 3,
        cooldownToolCalls: 0,
        maxSignatureBytes: 1024,
      },
    });
    const runContext = {
      context: { chatId: 'chat-2', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const first = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-1',
    });
    const second = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-2',
    });
    guard.approve('call-2', 'always');

    const third = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-3',
    });
    const fourth = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-4',
    });

    expect(first.action).toBe('allow');
    expect(second.action).toBe('ask');
    expect(third.action).toBe('allow');
    expect(fourth.action).toBe('allow');
    expect(guard.getPendingApproval('call-4')).toBeUndefined();
  });

  it('falls back to tool-only signature when args exceed limit', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 2,
        maxToolCalls: 10,
        maxAttempts: 2,
        cooldownToolCalls: 0,
        maxSignatureBytes: 5,
      },
    });
    const runContext = {
      context: { chatId: 'chat-3', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const first = guard.check({
      runContext,
      toolName: 'read',
      input: { text: 'abcdefghijk' },
      callId: 'call-1',
    });
    const second = guard.check({
      runContext,
      toolName: 'read',
      input: { text: 'lmnopqrstuv' },
      callId: 'call-2',
    });

    expect(first.action).toBe('allow');
    expect(second.action).toBe('ask');
  });

  it('stops after maxAttempts is reached', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 1,
        maxToolCalls: 10,
        maxAttempts: 1,
        cooldownToolCalls: 0,
        maxSignatureBytes: 1024,
      },
    });
    const runContext = {
      context: { chatId: 'chat-4', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const first = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-1',
    });
    guard.approve('call-1', 'once');

    const second = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-2',
    });

    expect(first.action).toBe('ask');
    expect(second.action).toBe('stop');
    expect(second.reason).toBe('max_attempts');
  });

  it('stops when UI is unavailable', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 1,
        maxToolCalls: 10,
        maxAttempts: 3,
        cooldownToolCalls: 0,
        maxSignatureBytes: 1024,
      },
      uiAvailable: false,
    });
    const runContext = {
      context: { chatId: 'chat-5', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const result = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-1',
    });

    expect(result.action).toBe('stop');
    expect(result.reason).toBe('no_ui');
  });

  it('skips detection when shouldSkip returns true', () => {
    const guard = createDoomLoopGuard({
      config: {
        sameToolThreshold: 1,
        maxToolCalls: 1,
        maxAttempts: 1,
        cooldownToolCalls: 0,
        maxSignatureBytes: 1024,
      },
      shouldSkip: () => true,
    });
    const runContext = {
      context: { chatId: 'chat-6', vaultRoot: '/vault' },
    } as RunContext<AgentContext>;

    const result = guard.check({
      runContext,
      toolName: 'read',
      input: { path: 'a.md' },
      callId: 'call-1',
    });

    expect(result.action).toBe('allow');
    expect(guard.getPendingApproval('call-1')).toBeUndefined();
  });
});
