import { describe, expect, it } from 'vitest';
import { resolveGeneratedImageSource, resolveImageGeneratorViewState } from './view-state';

describe('resolveImageGeneratorViewState', () => {
  it('loading 优先级最高', () => {
    expect(
      resolveImageGeneratorViewState({
        isLoading: true,
        error: 'boom',
        hasResult: true,
      })
    ).toBe('loading');
  });

  it('非 loading 且 error 时返回 error', () => {
    expect(
      resolveImageGeneratorViewState({
        isLoading: false,
        error: 'boom',
        hasResult: true,
      })
    ).toBe('error');
  });

  it('无 loading/error 且有结果时返回 ready', () => {
    expect(
      resolveImageGeneratorViewState({
        isLoading: false,
        error: null,
        hasResult: true,
      })
    ).toBe('ready');
  });

  it('无 loading/error/result 时返回 idle', () => {
    expect(
      resolveImageGeneratorViewState({
        isLoading: false,
        error: null,
        hasResult: false,
      })
    ).toBe('idle');
  });
});

describe('resolveGeneratedImageSource', () => {
  it('优先返回 url', () => {
    expect(resolveGeneratedImageSource({ url: 'https://example.com/img.png', b64_json: 'abc' })).toBe(
      'https://example.com/img.png'
    );
  });

  it('没有 url 时回退到 b64', () => {
    expect(resolveGeneratedImageSource({ b64_json: 'abc' })).toBe('data:image/png;base64,abc');
  });

  it('无可用图像数据时返回 null', () => {
    expect(resolveGeneratedImageSource({})).toBeNull();
  });
});
