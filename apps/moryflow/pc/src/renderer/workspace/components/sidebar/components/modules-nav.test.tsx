import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ModulesNav } from './modules-nav';

describe('ModulesNav', () => {
  it('renders module entries in order: Agent > Skills > Sites', () => {
    render(<ModulesNav destination="skills" onGo={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((item) => item.textContent?.trim())).toEqual(['Agent', 'Skills', 'Sites']);
  });

  it('navigates to agent-module when Agent is clicked', () => {
    const onGo = vi.fn();

    render(<ModulesNav destination="skills" onGo={onGo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(onGo).toHaveBeenCalledWith('agent-module');
  });
});
