/**
 * [PROVIDES]: image-generation Zustand store（状态 + setters + selectors）
 * [DEPENDS]: zustand, image-generation const/view-state
 * [POS]: 图片生成模块状态层（不包含网络请求）
 */

import { create } from 'zustand';
import { IMAGE_MODELS } from './const';
import type { ImageGenerationResponse } from './api';
import { resolveImageGeneratorViewState } from './view-state';

export interface ImageGenerationResult {
  response: ImageGenerationResponse;
  duration: number;
}

interface ImageGeneratorState {
  model: string;
  prompt: string;
  n: number;
  size: string;
  quality: string;
  background: string;
  outputFormat: string;
  seed: number | undefined;
  enableSafetyChecker: boolean;
  loading: boolean;
  error: string | null;
  result: ImageGenerationResult | null;
  rawResponseOpen: boolean;
  setModel: (value: string) => void;
  setPrompt: (value: string) => void;
  setN: (value: number) => void;
  setSize: (value: string) => void;
  setQuality: (value: string) => void;
  setBackground: (value: string) => void;
  setOutputFormat: (value: string) => void;
  setSeed: (value: number | undefined) => void;
  setEnableSafetyChecker: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setResult: (value: ImageGenerationResult | null) => void;
  setRawResponseOpen: (open: boolean) => void;
  reset: () => void;
}

const createInitialState = () => ({
  model: IMAGE_MODELS[0]?.id ?? '',
  prompt: '',
  n: 1,
  size: '1024x1024',
  quality: 'high',
  background: 'auto',
  outputFormat: 'png',
  seed: undefined,
  enableSafetyChecker: false,
  loading: false,
  error: null,
  result: null,
  rawResponseOpen: false,
});

export const useImageGeneratorStore = create<ImageGeneratorState>((set) => ({
  ...createInitialState(),
  setModel: (model) => set({ model }),
  setPrompt: (prompt) => set({ prompt }),
  setN: (n) => set({ n }),
  setSize: (size) => set({ size }),
  setQuality: (quality) => set({ quality }),
  setBackground: (background) => set({ background }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  setSeed: (seed) => set({ seed }),
  setEnableSafetyChecker: (enableSafetyChecker) => set({ enableSafetyChecker }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setResult: (result) => set({ result }),
  setRawResponseOpen: (rawResponseOpen) => set({ rawResponseOpen }),
  reset: () => set(createInitialState()),
}));

export const selectCurrentImageModel = (state: ImageGeneratorState) =>
  IMAGE_MODELS.find((item) => item.id === state.model) ?? IMAGE_MODELS[0];

export const selectImageGeneratorViewState = (state: ImageGeneratorState) =>
  resolveImageGeneratorViewState({
    isLoading: state.loading,
    error: state.error,
    hasResult: Boolean(state.result),
  });
