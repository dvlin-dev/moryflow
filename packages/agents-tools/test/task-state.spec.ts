import { describe, expect, it } from 'vitest';
import { EMPTY_TASK_STATE, clearDoneTaskState, normalizeTaskState } from '../src/task/task-state';

describe('task-state helpers', () => {
  it('returns EMPTY_TASK_STATE when a non-empty snapshot is replaced with an empty list', () => {
    const result = normalizeTaskState(
      {
        items: [{ id: 'tsk_1', title: 'Done', status: 'done' }],
        updatedAt: 10,
      },
      [],
      {
        now: () => 99,
        createId: () => 'unused',
      }
    );

    expect(result).toBe(EMPTY_TASK_STATE);
  });

  it('returns EMPTY_TASK_STATE when clearDone removes every item', () => {
    const result = clearDoneTaskState(
      {
        items: [{ id: 'tsk_1', title: 'Done', status: 'done' }],
        updatedAt: 10,
      },
      () => 99
    );

    expect(result).toBe(EMPTY_TASK_STATE);
  });

  it('rejects statuses outside todo/in_progress/done', () => {
    expect(() =>
      normalizeTaskState(
        undefined,
        [{ title: 'Bad status', status: 'blocked' } as unknown as never],
        {
          now: () => 1,
          createId: () => 'tsk_1',
        }
      )
    ).toThrow('task status must be one of todo, in_progress, done');
  });
});
