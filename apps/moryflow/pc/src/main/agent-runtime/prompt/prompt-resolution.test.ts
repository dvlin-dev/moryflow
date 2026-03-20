import { describe, expect, it } from 'vitest';
import type { AgentSettings } from '@shared/ipc';
import { resolveModelSettings, resolveSystemPrompt } from './prompt-resolution';

const createSettings = (customInstructions = ''): AgentSettings => ({
  model: { defaultModel: null },
  personalization: { customInstructions },
  mcp: { stdio: [], streamableHttp: [] },
  providers: [],
  customProviders: [],
  ui: { theme: 'system' },
});

describe('prompt-resolution', () => {
  it('returns the PC bash-first baseline prompt when personalization is empty', () => {
    const prompt = resolveSystemPrompt({ settings: createSettings('') });

    expect(prompt).toContain('# Identity');
    expect(prompt).toContain('The desktop runtime is Bash-First.');
    expect(prompt).not.toContain('The mobile runtime provides full file and search tools.');
    expect(prompt).not.toContain('<custom_instructions>');
  });

  it('injects personalization block when customInstructions is provided', () => {
    const prompt = resolveSystemPrompt({
      settings: createSettings('Keep answers short.'),
    });

    expect(prompt).toContain('<custom_instructions>');
    expect(prompt).toContain('Keep answers short.');
    expect(prompt).toContain('</custom_instructions>');
  });

  it('appends skill matching policy and available skills block after personalization', () => {
    const prompt = resolveSystemPrompt({
      settings: createSettings('Use markdown headings.'),
      availableSkillsBlock: '<available_skills>SkillA</available_skills>',
    });

    expect(prompt).toContain('<custom_instructions>');
    expect(prompt).toContain(
      'Decide whether to invoke a skill by intent-to-skill matching, not by task size or complexity.'
    );
    expect(prompt).toContain(
      'When user intent matches an available skill, prefer calling the `skill` tool proactively.'
    );
    expect(prompt).toContain('<available_skills>SkillA</available_skills>');
  });

  it('appends the platform rules after a custom base prompt override', () => {
    const prompt = resolveSystemPrompt({
      settings: createSettings(''),
      basePrompt: 'Custom agent prompt.',
    });

    expect(prompt).toContain('Custom agent prompt.');
    expect(prompt).toContain('The desktop runtime is Bash-First.');
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
