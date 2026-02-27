import { describe, expect, it } from 'vitest';

import {
  resolveActiveThinkingLevel,
  shouldRenderThinkingSelector,
} from './chat-prompt-input-thinking-selector.utils';
import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

const createThinkingProfile = (
  overrides?: Partial<ModelThinkingProfile>
): ModelThinkingProfile => ({
  supportsThinking: true,
  defaultLevel: 'off',
  levels: [
    { id: 'off', label: 'Off' },
    { id: 'high', label: 'High' },
  ],
  ...overrides,
});

describe('ChatPromptInputThinkingSelector helpers', () => {
  it('only renders selector when profile has multiple levels', () => {
    expect(shouldRenderThinkingSelector(undefined)).toBe(false);
    expect(shouldRenderThinkingSelector(createThinkingProfile({ supportsThinking: false }))).toBe(
      false
    );
    expect(
      shouldRenderThinkingSelector(createThinkingProfile({ levels: [{ id: 'off', label: 'Off' }] }))
    ).toBe(false);
    expect(shouldRenderThinkingSelector(createThinkingProfile())).toBe(true);
  });

  it('uses selected level when valid', () => {
    const profile = createThinkingProfile();
    expect(resolveActiveThinkingLevel(profile, 'high')).toBe('high');
  });

  it('falls back to profile default when selected level is invalid', () => {
    const profile = createThinkingProfile({ defaultLevel: 'high' });
    expect(resolveActiveThinkingLevel(profile, 'unknown-level')).toBe('high');
  });

  it('falls back to first level when default is invalid', () => {
    const profile = createThinkingProfile({
      defaultLevel: 'max',
      levels: [
        { id: 'off', label: 'Off' },
        { id: 'medium', label: 'Medium' },
      ],
    });
    expect(resolveActiveThinkingLevel(profile, null)).toBe('off');
  });
});
