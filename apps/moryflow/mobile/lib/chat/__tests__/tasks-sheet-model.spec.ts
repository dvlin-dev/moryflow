import { describe, expect, it } from 'vitest';
import type { TaskState } from '@moryflow/agents-runtime';
import {
  buildTaskSheetRows,
  TASK_STATUS_LABEL_KEYS,
} from '../../../components/chat/tasks-sheet-model';

describe('buildTaskSheetRows', () => {
  it('preserves snapshot order and only exposes checklist fields', () => {
    const taskState: TaskState = {
      items: [
        { id: 'task-1', title: 'Plan', status: 'done' },
        { id: 'task-2', title: 'Implement', status: 'in_progress', note: 'editing now' },
        { id: 'task-3', title: 'Review', status: 'todo' },
      ],
      updatedAt: 100,
    };

    expect(buildTaskSheetRows(taskState)).toEqual([
      { id: 'task-1', title: 'Plan', status: 'done' },
      { id: 'task-2', title: 'Implement', status: 'in_progress', note: 'editing now' },
      { id: 'task-3', title: 'Review', status: 'todo' },
    ]);
  });

  it('returns empty rows for missing snapshot and only maps lightweight statuses', () => {
    expect(buildTaskSheetRows(undefined)).toEqual([]);
    expect(TASK_STATUS_LABEL_KEYS).toEqual({
      todo: 'taskStatusTodo',
      in_progress: 'taskStatusInProgress',
      done: 'taskStatusDone',
    });
  });
});
