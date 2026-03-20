/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { buildDelegatedSubagentTools } from './subagent-tools';

const tool = (name: string) => ({ name }) as any;

describe('buildDelegatedSubagentTools', () => {
  it('会移除 subagent 自身，避免子代理递归调用', () => {
    const delegated = buildDelegatedSubagentTools(
      [tool('web_fetch'), tool('subagent'), tool('bash'), tool('subagent')],
      [tool('mcp_git')]
    );

    expect(delegated.map((item) => item.name)).toEqual(['web_fetch', 'bash', 'mcp_git']);
  });

  it('不会误删名称相近的其它工具', () => {
    const delegated = buildDelegatedSubagentTools([tool('subagent_runner'), tool('subagent')], []);

    expect(delegated.map((item) => item.name)).toEqual(['subagent_runner']);
  });
});
