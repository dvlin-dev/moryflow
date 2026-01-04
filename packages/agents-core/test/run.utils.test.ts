import { describe, it, expect } from 'vitest';
import { getTurnInput } from '../src/run';
import { RunMessageOutputItem as MessageOutputItem } from '../src/items';
import { Agent } from '../src/agent';
import { TEST_MODEL_MESSAGE } from './stubs';

describe('getTurnInput', () => {
  it('combines original string input with generated items', () => {
    const agent = new Agent({ name: 'A' });
    const item = new MessageOutputItem(TEST_MODEL_MESSAGE, agent);
    const result = getTurnInput('hello', [item]);
    expect(result[0]).toMatchObject({ role: 'user', type: 'message' });
    expect(result[1]).toEqual(TEST_MODEL_MESSAGE);
  });
});
