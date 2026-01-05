import { Agent } from '../src/index';
import { RealtimeAgent } from '../src/realtime';
import { isZodObject } from '../src/utils';
import { describe, test, expect } from 'vitest';

describe('Exports', () => {
  test('Agent is out there', () => {
    const agent = new Agent({ name: 'Test' });
    expect(agent.name).toBe('Test');
  });
});

describe('RealtimeAgent', () => {
  test('should be available', () => {
    const agent = new RealtimeAgent({ name: 'Test' });
    expect(agent.name).toBe('Test');
  });
});

describe('isZodObject', () => {
  test('should be available', () => {
    expect(isZodObject({})).toBe(false);
  });
});
