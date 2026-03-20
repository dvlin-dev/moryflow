import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getModulesRegistryItems } from '@/workspace/navigation/modules-registry';
import { ModulesNav } from './modules-nav';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const MODULE_LABEL_KEYS: Record<string, string> = {
  'remote-agents': 'remoteAgentsTitle',
  automations: 'automationsTitle',
  memory: 'memoryPageTitle',
  skills: 'skillsTitle',
  sites: 'sitesTitle',
};

describe('ModulesNav', () => {
  it('renders module entries following the registry order', () => {
    render(<ModulesNav destination="skills" onGo={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((item) => item.textContent?.trim())).toEqual(
      getModulesRegistryItems().map((item) => MODULE_LABEL_KEYS[item.destination])
    );
  });

  it('navigates to remote-agents when Remote Agents is clicked', () => {
    const onGo = vi.fn();

    render(<ModulesNav destination="skills" onGo={onGo} />);

    fireEvent.click(screen.getByRole('button', { name: 'remoteAgentsTitle' }));
    expect(onGo).toHaveBeenCalledWith('remote-agents');
  });
});
