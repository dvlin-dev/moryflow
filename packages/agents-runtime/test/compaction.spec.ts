import { describe, expect, it } from 'vitest';
import type { AgentInputItem } from '@openai/agents-core';

import { compactHistory } from '../src/compaction';

const makeUser = (text: string): AgentInputItem => ({ role: 'user', content: text });

const makeAssistant = (text: string): AgentInputItem => ({
  role: 'assistant',
  status: 'completed',
  content: [{ type: 'output_text', text }],
});

const makeToolOutput = (name: string, callId: string, output: string): AgentInputItem => ({
  type: 'function_call_result',
  name,
  callId,
  status: 'completed',
  output,
});

describe('compaction', () => {
  it('rewrites history with summary and keeps recent turns', async () => {
    const longAssistant = 'A'.repeat(11000);
    const toolPayload = 'O'.repeat(80);
    const history: AgentInputItem[] = [
      makeUser('U1'),
      makeToolOutput('read', 'call-1', toolPayload),
      makeAssistant(longAssistant),
      makeUser('U2'),
      makeToolOutput('read', 'call-2', toolPayload),
      makeAssistant('A2'),
      makeUser('U3'),
      makeToolOutput('read', 'call-3', toolPayload),
      makeAssistant('A3'),
      makeUser('U4'),
      makeAssistant('A4'),
    ];

    const summaryInputs: AgentInputItem[][] = [];
    const result = await compactHistory({
      history,
      config: {
        contextWindow: 4000,
        fallbackCharLimit: 200,
        protectedTurns: 2,
      },
      summaryBuilder: async (items) => {
        summaryInputs.push(items);
        return '已完成：整理历史；当前进度：保持最近 2 轮；涉及文件：无；下一步：继续对话。';
      },
    });

    expect(result.triggered).toBe(true);
    expect(result.summaryApplied).toBe(true);
    expect(result.history[0]).toMatchObject({ role: 'system' });
    expect((result.history[0] as { content?: string }).content).toContain('【会话摘要】');

    const hasOldToolOutput = result.history.some(
      (item) => (item as { callId?: string }).callId === 'call-1'
    );
    const hasRecentToolOutput = result.history.some(
      (item) => (item as { callId?: string }).callId === 'call-3'
    );
    expect(hasOldToolOutput).toBe(false);
    expect(hasRecentToolOutput).toBe(true);
    expect(
      summaryInputs[0]?.some((item) => (item as { callId?: string }).callId === 'call-1')
    ).toBe(true);
  });

  it('falls back to pruning when summary fails', async () => {
    const longAssistant = 'A'.repeat(11000);
    const history: AgentInputItem[] = [
      makeUser('U1'),
      makeToolOutput('read', 'call-1', 'old output'),
      makeToolOutput('write', 'call-2', 'protected output'),
      makeAssistant(longAssistant),
      makeUser('U2'),
      makeAssistant('A2'),
      makeUser('U3'),
      makeAssistant('A3'),
      makeUser('U4'),
    ];

    const result = await compactHistory({
      history,
      config: {
        contextWindow: 4000,
        fallbackCharLimit: 200,
        protectedTurns: 3,
      },
      summaryBuilder: async () => {
        throw new Error('summary failed');
      },
    });

    const hasRemovedOutput = result.history.some(
      (item) => (item as { callId?: string }).callId === 'call-1'
    );
    const hasProtectedOutput = result.history.some(
      (item) => (item as { callId?: string }).callId === 'call-2'
    );

    expect(result.summaryApplied).toBe(false);
    expect(hasRemovedOutput).toBe(false);
    expect(hasProtectedOutput).toBe(true);
  });
});
