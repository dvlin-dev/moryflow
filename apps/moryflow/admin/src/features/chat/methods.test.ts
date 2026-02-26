import { describe, expect, it } from 'vitest';
import { resolveNextSelectedModelId, shouldPreserveStoredModelPreference } from './methods';

describe('resolveNextSelectedModelId', () => {
  const groups = [
    {
      label: 'openai',
      options: [
        { id: 'gpt-4.1', name: 'GPT 4.1', provider: 'openai', maxContextTokens: 128000 },
        { id: 'gpt-4o', name: 'GPT 4o', provider: 'openai', maxContextTokens: 128000 },
      ],
    },
  ];

  it('保留仍然可用的模型选择', () => {
    expect(resolveNextSelectedModelId(groups, 'gpt-4o')).toBe('gpt-4o');
  });

  it('当候选模型不存在时回退到首个可用模型', () => {
    expect(resolveNextSelectedModelId(groups, 'claude-3.7')).toBe('gpt-4.1');
  });

  it('无可用模型时返回 null', () => {
    expect(resolveNextSelectedModelId([], null)).toBeNull();
  });
});

describe('shouldPreserveStoredModelPreference', () => {
  it('初始加载且无模型数据时保留本地偏好', () => {
    expect(shouldPreserveStoredModelPreference([], true, null)).toBe(true);
  });

  it('请求报错且无模型数据时保留本地偏好', () => {
    expect(shouldPreserveStoredModelPreference([], false, new Error('boom'))).toBe(true);
  });

  it('空列表但加载完成无错误时允许清空无效选择', () => {
    expect(shouldPreserveStoredModelPreference([], false, null)).toBe(false);
  });
});
