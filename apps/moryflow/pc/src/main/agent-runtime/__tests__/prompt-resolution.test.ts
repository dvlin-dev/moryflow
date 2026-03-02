import { describe, expect, it } from 'vitest';
import type { AgentSettings } from '@shared/ipc';
import { resolveModelSettings, resolveSystemPrompt } from '../prompt-resolution';

const createSettings = (customInstructions = ''): AgentSettings => ({
  model: { defaultModel: null },
  personalization: { customInstructions },
  mcp: { stdio: [], streamableHttp: [] },
  providers: [],
  customProviders: [],
  ui: { theme: 'system' },
});

describe('prompt-resolution', () => {
  it('returns baseline prompt when personalization is empty', () => {
    const prompt = resolveSystemPrompt(createSettings(''));
    expect(prompt).toContain('# Identity');
    expect(prompt).not.toContain('<custom_instructions>');
  });

  it('injects personalization block when customInstructions is provided', () => {
    const prompt = resolveSystemPrompt(createSettings('Keep answers short.'));
    expect(prompt).toContain('<custom_instructions>');
    expect(prompt).toContain('Keep answers short.');
    expect(prompt).toContain('</custom_instructions>');
  });

  it('appends available skills block after personalization', () => {
    const prompt = resolveSystemPrompt(
      createSettings('Use markdown headings.'),
      undefined,
      '<available_skills>SkillA</available_skills>'
    );

    expect(prompt).toContain('<custom_instructions>');
    expect(prompt).toContain('You can use installed skills to solve user tasks when relevant.');
    expect(prompt).toContain('<available_skills>SkillA</available_skills>');
  });

  it('returns undefined model settings when agent definition has no modelSettings', () => {
    expect(resolveModelSettings(undefined)).toBeUndefined();
  });

  it('uses agent definition modelSettings when provided', () => {
    const resolved = resolveModelSettings({
      modelSettings: {
        temperature: 0.3,
        topP: 0.9,
      },
    } as any);

    expect(resolved).toEqual({
      temperature: 0.3,
      topP: 0.9,
    });
  });
});
