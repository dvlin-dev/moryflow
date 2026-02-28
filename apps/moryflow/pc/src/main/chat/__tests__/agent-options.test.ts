import { describe, expect, it } from 'vitest';
import { normalizeAgentOptions } from '../agent-options.js';

describe('normalizeAgentOptions', () => {
  it('returns undefined for non-object input', () => {
    expect(normalizeAgentOptions(null)).toBeUndefined();
    expect(normalizeAgentOptions('text')).toBeUndefined();
    expect(normalizeAgentOptions(123)).toBeUndefined();
  });

  it('normalizes selected skill and legacy context fields', () => {
    const normalized = normalizeAgentOptions({
      selectedSkill: { name: '  better-auth-best-practices  ' },
      activeFilePath: 'notes/today.md',
      contextSummary: '  focus todo  ',
    });

    expect(normalized).toEqual({
      selectedSkill: { name: 'better-auth-best-practices' },
      context: {
        filePath: 'notes/today.md',
        summary: 'focus todo',
      },
    });
  });

  it('prefers context object over legacy fields and ignores empty skill name', () => {
    const normalized = normalizeAgentOptions({
      preferredModelId: 'gpt-5-codex',
      thinking: { mode: 'level', level: '  high  ' },
      selectedSkill: { name: '   ' },
      activeFilePath: 'legacy.md',
      contextSummary: 'legacy summary',
      context: {
        filePath: 'from-context.md',
        summary: 'from context',
      },
    });

    expect(normalized).toEqual({
      preferredModelId: 'gpt-5-codex',
      thinking: { mode: 'level', level: 'high' },
      context: {
        filePath: 'from-context.md',
        summary: 'from context',
      },
    });
  });

  it('normalizes thinking off selection', () => {
    const normalized = normalizeAgentOptions({
      thinking: { mode: 'off' },
    });

    expect(normalized).toEqual({
      thinking: { mode: 'off' },
    });
  });

  it('normalizes thinking profile and guarantees off level', () => {
    const normalized = normalizeAgentOptions({
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'high',
        levels: [
          { id: 'high', label: 'High' },
          { id: 'high', label: 'Duplicate' },
        ],
      },
    });

    expect(normalized).toEqual({
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'high',
        levels: [
          { id: 'off', label: 'Off' },
          { id: 'high', label: 'Duplicate' },
        ],
      },
    });
  });

  it('keeps thinking visibleParams during normalization', () => {
    const normalized = normalizeAgentOptions({
      preferredModelId: 'openai/gpt-5.2',
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'medium',
        levels: [
          { id: 'off', label: 'Off' },
          {
            id: 'medium',
            label: 'Medium',
            visibleParams: [{ key: 'reasoningEffort', value: 'medium' }],
          },
        ],
      },
    });

    expect(normalized).toEqual({
      preferredModelId: 'openai/gpt-5.2',
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'medium',
        levels: [
          { id: 'off', label: 'Off' },
          {
            id: 'medium',
            label: 'Medium',
            visibleParams: [{ key: 'reasoningEffort', value: 'medium' }],
          },
        ],
      },
    });
  });
});
