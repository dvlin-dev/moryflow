import { describe, test, expect } from 'vitest';

import { Agent } from '../src/index';

describe('index.ts', () => {
  test('has expected exports', () => {
    const agent = new Agent({
      name: 'TestAgent',
      outputType: 'text',
    });
    expect(agent).toBeDefined();
    expect(agent.name).toEqual('TestAgent');
  });
});
