import { describe, it, expect } from 'vitest';
import { detectAtTrigger, removeAtTrigger } from './at-mention';

describe('detectAtTrigger', () => {
  it('detects @ insertion and returns index', () => {
    const index = detectAtTrigger({
      previousValue: '',
      nextValue: '@',
      caretIndex: 1,
      insertedData: '@',
    });
    expect(index).toBe(0);
  });

  it('returns null when no @ inserted', () => {
    const index = detectAtTrigger({
      previousValue: 'hello',
      nextValue: 'hello',
      caretIndex: 5,
      insertedData: null,
    });
    expect(index).toBeNull();
  });
});

describe('removeAtTrigger', () => {
  it('removes @ at the trigger index', () => {
    expect(removeAtTrigger('hi @there', 3)).toBe('hi there');
  });

  it('returns original value when index is invalid', () => {
    expect(removeAtTrigger('hello', null)).toBe('hello');
    expect(removeAtTrigger('hello', -1)).toBe('hello');
    expect(removeAtTrigger('hello', 10)).toBe('hello');
  });
});
