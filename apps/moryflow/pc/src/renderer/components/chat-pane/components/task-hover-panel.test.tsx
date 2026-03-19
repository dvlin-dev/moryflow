import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { TaskState } from '@moryflow/agents-runtime';
import { TaskHoverPanel } from './task-hover-panel';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const taskState: TaskState = {
  items: [
    {
      id: 'task-1',
      title: 'Designing the Site Framework',
      status: 'in_progress',
      note: 'Refine the new snapshot-only flow',
    },
    {
      id: 'task-2',
      title: 'Preliminary Research',
      status: 'done',
    },
  ],
  updatedAt: 100,
};

describe('TaskHoverPanel', () => {
  it('renders collapsed summary with active task and progress', () => {
    render(<TaskHoverPanel taskState={taskState} isActive />);

    const toggle = screen.getByLabelText('expand');

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getAllByText('Designing the Site Framework').length).toBeGreaterThan(0);
    expect(screen.getByText('1/2')).not.toBeNull();
  });

  it('renders whenever snapshot is non-empty, even if only done items remain', () => {
    render(
      <TaskHoverPanel
        taskState={{
          items: [{ id: 'task-2', title: 'Preliminary Research', status: 'done' }],
          updatedAt: 100,
        }}
        isActive
      />
    );

    expect(screen.queryByLabelText('expand')).not.toBeNull();
    expect(screen.getByText('1/1')).not.toBeNull();
  });

  it('expands list and shows checklist rows with optional note only', () => {
    render(<TaskHoverPanel taskState={taskState} isActive />);

    const toggle = screen.getByLabelText('expand');
    const listId = toggle.getAttribute('aria-controls');
    const list = listId ? document.getElementById(listId) : null;

    expect(list).not.toBeNull();
    expect(list?.className).toContain('max-h-0');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(list?.className).toContain('max-h-80');
    expect(screen.getAllByText('Preliminary Research').length).toBeGreaterThan(0);
    expect(screen.getByText('Refine the new snapshot-only flow')).not.toBeNull();
    expect(screen.queryByText('taskPanelLoadFailed')).toBeNull();
    expect(screen.queryByText('noTasks')).toBeNull();
  });

  it('does not render when snapshot is empty', () => {
    render(<TaskHoverPanel taskState={{ items: [], updatedAt: 0 }} isActive />);

    expect(screen.queryByLabelText('expand')).toBeNull();
  });

  it('does not render when isActive is false even with tasks', () => {
    render(<TaskHoverPanel taskState={taskState} isActive={false} />);

    expect(screen.queryByLabelText('expand')).toBeNull();
  });

  it('renders when isActive is true and tasks exist', () => {
    render(<TaskHoverPanel taskState={taskState} isActive />);

    expect(screen.queryByLabelText('expand')).not.toBeNull();
  });
});
