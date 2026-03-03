import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runMock, agentCtorMock } = vi.hoisted(() => ({
  runMock: vi.fn(async () => ({ finalOutput: 'ok' })),
  agentCtorMock: vi.fn(),
}));

vi.mock('@openai/agents-core', () => ({
  Agent: class {
    constructor(options: unknown) {
      agentCtorMock(options);
    }
  },
  run: runMock,
  tool: (definition: unknown) => definition,
}));

vi.mock('@moryflow/agents-runtime', () => ({
  normalizeToolSchemasForInterop: (tools: unknown) => tools,
}));

import { createSubagentTool } from '../src/task/subagent-tool';

const createRunContext = () =>
  ({
    context: {
      buildModel: () => ({ baseModel: { id: 'test-model' } }),
    },
  }) as any;

describe('createSubagentTool', () => {
  beforeEach(() => {
    runMock.mockClear();
    agentCtorMock.mockClear();
  });

  it('函数式工具配置应按调用时动态解析，避免维护独立子代理工具清单', async () => {
    const dynamicTools: Array<{ name: string }> = [{ name: 'web_fetch' }];
    const subagentTool = createSubagentTool(() => [...dynamicTools], 'subagent instructions');

    await subagentTool.execute({ summary: 's1', prompt: 'p1' }, createRunContext());
    expect(agentCtorMock).toHaveBeenCalledTimes(1);
    const firstTools = (agentCtorMock.mock.calls[0][0] as { tools: Array<{ name: string }> }).tools;
    expect(firstTools.map((tool) => tool.name)).toEqual(['web_fetch']);

    dynamicTools.push({ name: 'bash' });

    await subagentTool.execute({ summary: 's2', prompt: 'p2' }, createRunContext());
    expect(agentCtorMock).toHaveBeenCalledTimes(2);
    const secondTools = (agentCtorMock.mock.calls[1][0] as { tools: Array<{ name: string }> })
      .tools;
    expect(secondTools.map((tool) => tool.name)).toEqual(['web_fetch', 'bash']);
  });

  it('动态配置解析为空时应返回可读错误', async () => {
    const subagentTool = createSubagentTool(() => []);
    const result = await subagentTool.execute(
      { summary: 'subagent', prompt: 'do something' },
      createRunContext()
    );

    expect(result).toEqual({
      success: false,
      summary: 'subagent',
      error: '子代理执行失败: 未配置子代理工具集',
    });
    expect(runMock).not.toHaveBeenCalled();
  });
});
