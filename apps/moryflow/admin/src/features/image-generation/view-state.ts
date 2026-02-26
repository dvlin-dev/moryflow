import type { ImageData } from './api';

export type ImageGeneratorViewState = 'idle' | 'loading' | 'error' | 'ready';

interface ResolveImageGeneratorViewStateParams {
  isLoading: boolean;
  error: string | null;
  hasResult: boolean;
}

export function resolveImageGeneratorViewState({
  isLoading,
  error,
  hasResult,
}: ResolveImageGeneratorViewStateParams): ImageGeneratorViewState {
  if (isLoading) {
    return 'loading';
  }
  if (error) {
    return 'error';
  }
  if (hasResult) {
    return 'ready';
  }
  return 'idle';
}

export function resolveGeneratedImageSource(image: ImageData): string | null {
  if (image.url) {
    return image.url;
  }
  if (image.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  return null;
}
