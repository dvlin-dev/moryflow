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
      context: {
        filePath: 'from-context.md',
        summary: 'from context',
      },
    });
  });
});
