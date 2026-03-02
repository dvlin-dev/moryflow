import { describe, expect, it } from 'vitest';
import { defaultValues, formSchema, settingsSections } from './const';

describe('settings-dialog const', () => {
  it('uses personalization section and removes system-prompt section', () => {
    const sectionIds = settingsSections.map((section) => section.id);
    expect(sectionIds).toContain('personalization');
    expect(sectionIds).not.toContain('system-prompt');
  });

  it('form schema supports personalization.customInstructions', () => {
    const parsed = formSchema.parse({
      ...defaultValues,
      personalization: {
        customInstructions: 'Use concise responses.',
      },
    });

    expect(parsed.personalization.customInstructions).toBe('Use concise responses.');
  });
});
