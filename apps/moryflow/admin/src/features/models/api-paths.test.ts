import { describe, expect, it } from 'vitest';
import { buildModelsListPath } from './query-paths';

describe('models api path builders', () => {
  it('providerId 未提供时应返回基础路径', () => {
    expect(buildModelsListPath()).toBe('/ai/models');
  });

  it('providerId 提供时应附带查询参数', () => {
    expect(buildModelsListPath('provider-1')).toBe('/ai/models?providerId=provider-1');
  });

  it('providerId 应进行 URL 编码', () => {
    expect(buildModelsListPath('provider test')).toBe('/ai/models?providerId=provider+test');
  });
});
