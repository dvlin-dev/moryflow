import { describe, expect, it } from 'vitest';
import { EMPTY_TASK_STATE } from '../task-state';

describe('EMPTY_TASK_STATE', () => {
  it('is deeply frozen for the shared empty snapshot contract', () => {
    expect(Object.isFrozen(EMPTY_TASK_STATE)).toBe(true);
    expect(Object.isFrozen(EMPTY_TASK_STATE.items)).toBe(true);
    expect(EMPTY_TASK_STATE).toEqual({
      items: [],
      updatedAt: 0,
    });
  });
});
