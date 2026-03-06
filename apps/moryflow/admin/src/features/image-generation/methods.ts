/**
 * [PROVIDES]: imageGeneratorMethods（submit/reset/request 构建）
 * [DEPENDS]: image-generation api/store
 * [POS]: 图片生成模块业务编排层
 */

import { ApiError } from '@/lib/api-client';
import { generateImage, type ImageGenerationRequest } from './api';
import { IMAGE_MODELS } from './const';
import { useImageGeneratorStore } from './store';

interface BuildImageGenerationRequestParams {
  model: string;
  prompt: string;
  n: number;
  size: string;
  quality: string;
  background: string;
  outputFormat: string;
  seed: number | undefined;
  enableSafetyChecker: boolean;
}

export function buildImageGenerationRequest({
  model,
  prompt,
  n,
  size,
  quality,
  background,
  outputFormat,
  seed,
  enableSafetyChecker,
}: BuildImageGenerationRequestParams): ImageGenerationRequest {
  const currentModel = IMAGE_MODELS.find((item) => item.id === model) ?? IMAGE_MODELS[0];

  const request: ImageGenerationRequest = {
    model,
    prompt: prompt.trim(),
    n,
    size,
    quality,
  };

  if (currentModel.params.includes('background')) {
    request.background = background;
  }
  if (currentModel.params.includes('output_format')) {
    request.output_format = outputFormat;
  }
  if (currentModel.params.includes('seed') && seed !== undefined) {
    request.seed = seed;
  }
  if (currentModel.params.includes('enable_safety_checker')) {
    request.enable_safety_checker = enableSafetyChecker;
  }

  return request;
}

export async function submitImageGeneration(): Promise<void> {
  const state = useImageGeneratorStore.getState();
  if (!state.prompt.trim()) {
    state.setError('请输入 Prompt');
    return;
  }

  state.setLoading(true);
  state.setError(null);
  state.setResult(null);
  state.setRawResponseOpen(false);

  const startTime = Date.now();

  try {
    const request = buildImageGenerationRequest({
      model: state.model,
      prompt: state.prompt,
      n: state.n,
      size: state.size,
      quality: state.quality,
      background: state.background,
      outputFormat: state.outputFormat,
      seed: state.seed,
      enableSafetyChecker: state.enableSafetyChecker,
    });

    const response = await generateImage(request);
    const duration = Date.now() - startTime;
    useImageGeneratorStore.getState().setResult({ response, duration });
  } catch (error) {
    if (error instanceof ApiError) {
      useImageGeneratorStore.getState().setError(`${error.message} (${error.status})`);
    } else {
      useImageGeneratorStore
        .getState()
        .setError(error instanceof Error ? error.message : '未知错误');
    }
  } finally {
    useImageGeneratorStore.getState().setLoading(false);
  }
}

export function resetImageGeneratorState(): void {
  useImageGeneratorStore.getState().reset();
}

export const imageGeneratorMethods = {
  submitImageGeneration,
  resetImageGeneratorState,
};
