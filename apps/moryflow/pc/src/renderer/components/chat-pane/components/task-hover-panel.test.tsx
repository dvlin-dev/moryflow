import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TaskRecord } from '@shared/ipc';
import { TaskHoverPanel } from './task-hover-panel';
import { useTasks } from '../hooks';

vi.mock('../hooks', () => ({
  useTasks: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseTasks = vi.mocked(useTasks);

const now = new Date().toISOString();

const activeTask: TaskRecord = {
  id: 'task-1',
  chatId: 'chat-1',
  title: 'Designing the Site Framework',
  description: 'Design the architecture',
  status: 'in_progress',
  priority: 'p1',
  owner: null,
  createdAt: now,
  updatedAt: now,
  version: 1,
};

const doneTask: TaskRecord = {
  id: 'task-2',
  chatId: 'chat-1',
  title: 'Preliminary Research',
  description: 'Research background and gather requirements',
  status: 'done',
  priority: 'p2',
  owner: null,
  createdAt: now,
  updatedAt: now,
  version: 1,
};

const buildUseTasksState = (overrides: Partial<ReturnType<typeof useTasks>> = {}) => ({
  tasks: [activeTask, doneTask],
  detail: null,
  selectedTaskId: null,
  isLoading: false,
  isDetailLoading: false,
  selectTask: vi.fn(),
  clearSelection: vi.fn(),
  error: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('TaskHoverPanel', () => {
  beforeEach(() => {
    mockUseTasks.mockReset();
  });

  it('renders collapsed summary with active task and progress', () => {
    mockUseTasks.mockReturnValue(buildUseTasksState());

    render(<TaskHoverPanel activeSessionId="chat-1" isSessionRunning />);

    const toggle = screen.getByLabelText('expand');

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getAllByText('Designing the Site Framework').length).toBeGreaterThan(0);
    expect(screen.getByText('1/2')).not.toBeNull();
  });

  it('does not render when there are no active tasks', () => {
    mockUseTasks.mockReturnValue(
      buildUseTasksState({
        tasks: [doneTask],
      })
    );

    render(<TaskHoverPanel activeSessionId="chat-1" isSessionRunning />);

    expect(screen.queryByLabelText('expand')).toBeNull();
  });

  it('expands list and shows task titles only', () => {
    mockUseTasks.mockReturnValue(buildUseTasksState());

    render(<TaskHoverPanel activeSessionId="chat-1" isSessionRunning />);

    const toggle = screen.getByLabelText('expand');
    const listId = toggle.getAttribute('aria-controls');
    const list = listId ? document.getElementById(listId) : null;

    expect(list).not.toBeNull();
    expect(list?.className).toContain('max-h-0');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(list?.className).toContain('max-h-80');
    expect(screen.getAllByText('Preliminary Research').length).toBeGreaterThan(0);
    expect(screen.queryByText('taskPanelShowMore')).toBeNull();
    expect(screen.queryByText('taskPanelShowLess')).toBeNull();
  });

  it('does not render when session is not running', () => {
    mockUseTasks.mockReturnValue(buildUseTasksState());

    render(<TaskHoverPanel activeSessionId="chat-1" isSessionRunning={false} />);

    expect(screen.queryByLabelText('expand')).toBeNull();
  });
});
