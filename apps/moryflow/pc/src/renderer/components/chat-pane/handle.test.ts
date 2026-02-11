import { describe, expect, it } from 'vitest';
import { computeAgentOptions } from './handle';

describe('computeAgentOptions', () => {
  it('returns undefined when all inputs are empty', () => {
    expect(
      computeAgentOptions({
        activeFilePath: null,
        contextSummary: '   ',
        preferredModelId: ' ',
        selectedSkillName: '',
      })
    ).toBeUndefined();
  });

  it('builds options with trimmed model, summary and selected skill', () => {
    expect(
      computeAgentOptions({
        activeFilePath: 'notes/project.md',
        contextSummary: '  focus section A  ',
        preferredModelId: '  gpt-5-codex  ',
        selectedSkillName: '  better-auth-best-practices  ',
      })
    ).toEqual({
      context: {
        filePath: 'notes/project.md',
        summary: 'focus section A',
      },
      preferredModelId: 'gpt-5-codex',
      selectedSkill: {
        name: 'better-auth-best-practices',
      },
    });
  });

  it('keeps context when only file path exists', () => {
    expect(
      computeAgentOptions({
        activeFilePath: 'notes/only-file.md',
      })
    ).toEqual({
      context: {
        filePath: 'notes/only-file.md',
      },
    });
  });
});
