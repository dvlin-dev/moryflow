import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModulesNav } from './modules-nav';

describe('ModulesNav', () => {
  it('renders module entries in order: Remote Agents > Memory > Skills > Sites', () => {
    render(<ModulesNav destination="skills" onGo={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((item) => item.textContent?.trim())).toEqual([
      'Remote Agents',
      'Memory',
      'Skills',
      'Sites',
    ]);
  });

  it('navigates to remote-agents when Remote Agents is clicked', () => {
    const onGo = vi.fn();

    render(<ModulesNav destination="skills" onGo={onGo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remote Agents' }));
    expect(onGo).toHaveBeenCalledWith('remote-agents');
  });
});
