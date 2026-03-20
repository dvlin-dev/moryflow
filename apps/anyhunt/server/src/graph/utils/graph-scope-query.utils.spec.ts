import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseGraphScopeQuery } from './graph-scope-query.utils';

describe('parseGraphScopeQuery', () => {
  it('reads project_id and ignores legacy metadata-style keys', () => {
    const scope = parseGraphScopeQuery({
      project_id: 'project-1',
      'metadata[__proto__][polluted]': 'yes',
      'metadata[topic]': 'alpha',
    });

    expect(scope).toEqual({
      project_id: 'project-1',
    });
  });

  it('uses the last project_id value when query parsers provide arrays', () => {
    const scope = parseGraphScopeQuery({
      project_id: ['project-1', 'project-2'],
    });

    expect(scope).toEqual({
      project_id: 'project-2',
    });
  });

  it('maps invalid scope input to a 400 bad request error', () => {
    expect(() =>
      parseGraphScopeQuery({
        user_id: '',
      }),
    ).toThrow(BadRequestException);
  });
});
