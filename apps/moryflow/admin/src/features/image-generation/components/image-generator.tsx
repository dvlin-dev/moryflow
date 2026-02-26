/**
 * 图片生成器组件
 * 表单输入 + 结果展示
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from 'lucide-react';
import { generateImage, type ImageGenerationRequest } from '../api';
import { IMAGE_MODELS } from '../const';
import { resolveImageGeneratorViewState } from '../view-state';
import { ImageGeneratorForm } from './image-generator-form';
import { ImageGeneratorResult, type GenerationResult } from './image-generator-result';
import { ApiError } from '@/lib/api-client';

function buildImageGenerationRequest({
  model,
  prompt,
  n,
  size,
  quality,
  background,
  outputFormat,
  seed,
  enableSafetyChecker,
}: {
  model: string;
  prompt: string;
  n: number;
  size: string;
  quality: string;
  background: string;
  outputFormat: string;
  seed: number | undefined;
  enableSafetyChecker: boolean;
}): ImageGenerationRequest {
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

export function ImageGenerator() {
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('high');
  const [background, setBackground] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('png');
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [rawResponseOpen, setRawResponseOpen] = useState(false);

  const currentModel = IMAGE_MODELS.find((item) => item.id === model) ?? IMAGE_MODELS[0];
  const viewState = resolveImageGeneratorViewState({
    isLoading: loading,
    error,
    hasResult: !!result,
  });

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('请输入 Prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setRawResponseOpen(false);

    const startTime = Date.now();

    try {
      const request = buildImageGenerationRequest({
        model,
        prompt,
        n,
        size,
        quality,
        background,
        outputFormat,
        seed,
        enableSafetyChecker,
      });

      const response = await generateImage(request);
      const duration = Date.now() - startTime;

      setResult({ response, duration });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`${err.message} (${err.status})`);
      } else {
        setError(err instanceof Error ? err.message : '未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            生成参数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageGeneratorForm
            model={model}
            prompt={prompt}
            n={n}
            size={size}
            quality={quality}
            background={background}
            outputFormat={outputFormat}
            seed={seed}
            enableSafetyChecker={enableSafetyChecker}
            loading={loading}
            error={error}
            currentModel={currentModel}
            onModelChange={setModel}
            onPromptChange={setPrompt}
            onNChange={setN}
            onSizeChange={setSize}
            onQualityChange={setQuality}
            onBackgroundChange={setBackground}
            onOutputFormatChange={setOutputFormat}
            onSeedChange={setSeed}
            onEnableSafetyCheckerChange={setEnableSafetyChecker}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生成结果</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageGeneratorResult
            viewState={viewState}
            result={result}
            error={error}
            rawResponseOpen={rawResponseOpen}
            onRawResponseOpenChange={setRawResponseOpen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
