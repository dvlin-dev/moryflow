import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditModelDialog, type EditModelInitialData } from './edit-model-dialog';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const buildInitialData = (): EditModelInitialData => ({
  id: 'gpt-4o',
  name: 'GPT-4o',
  isPreset: true,
  capabilities: {
    reasoning: true,
    attachment: true,
    toolCall: true,
    temperature: true,
  },
  limits: {
    context: 128_000,
    output: 16_384,
  },
  inputModalities: ['text', 'image'],
  thinking: {
    defaultLevel: 'off',
  },
});

describe('EditModelDialog', () => {
  it('renders open dialog without triggering update-depth loops', () => {
    expect(() =>
      render(
        <EditModelDialog
          open
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          initialData={buildInitialData()}
          sdkType="openai-compatible"
        />
      )
    ).not.toThrow();

    expect(screen.queryByText('editModelPresetTitle')).toBeTruthy();
    expect(screen.queryByDisplayValue('GPT-4o')).toBeTruthy();
  });
});
