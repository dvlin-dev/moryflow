import { describe, expect, it } from 'vitest';
import { parseGraphScopeQuery } from './graph-scope-query.utils';

describe('parseGraphScopeQuery', () => {
  it('ignores dangerous prototype keys in bracketed metadata paths', () => {
    const before = ({} as { polluted?: string }).polluted;

    const scope = parseGraphScopeQuery({
      project_id: 'project-1',
      'metadata[__proto__][polluted]': 'yes',
      'metadata[topic]': 'alpha',
    });

    expect(scope).toEqual({
      project_id: 'project-1',
      metadata: {
        topic: 'alpha',
      },
    });
    expect(({} as { polluted?: string }).polluted).toBe(before);
  });
});
