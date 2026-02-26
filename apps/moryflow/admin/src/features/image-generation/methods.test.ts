import { describe, expect, it } from 'vitest';
import { buildImageGenerationRequest } from './methods';

describe('buildImageGenerationRequest', () => {
  it('gpt-image-1.5 只携带支持参数', () => {
    const request = buildImageGenerationRequest({
      model: 'gpt-image-1.5',
      prompt: '  hello world  ',
      n: 2,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      outputFormat: 'png',
      seed: 99,
      enableSafetyChecker: true,
    });

    expect(request).toEqual({
      model: 'gpt-image-1.5',
      prompt: 'hello world',
      n: 2,
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      output_format: 'png',
    });
  });

  it('seedream-4.5 不应携带 gpt-image 专属字段', () => {
    const request = buildImageGenerationRequest({
      model: 'seedream-4.5',
      prompt: 'seed test',
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      background: 'opaque',
      outputFormat: 'jpeg',
      seed: 7,
      enableSafetyChecker: true,
    });

    expect(request).toEqual({
      model: 'seedream-4.5',
      prompt: 'seed test',
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      seed: 7,
      enable_safety_checker: true,
    });
  });
});
