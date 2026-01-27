/**
 * 图片生成器组件
 * 表单输入 + 结果展示
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDown, ArrowUp, Image, Loader } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import {
  IMAGE_MODELS,
  IMAGE_SIZES,
  IMAGE_QUALITIES,
  BACKGROUND_OPTIONS,
  OUTPUT_FORMATS,
  type ImageModel,
} from '../const';
import { generateImage, type ImageGenerationRequest, type ImageGenerationResponse } from '../api';
import { ApiError } from '@/lib/api-client';

/** 生成结果 */
interface GenerationResult {
  response: ImageGenerationResponse;
  duration: number;
}

export function ImageGenerator() {
  // 表单状态
  const [model, setModel] = useState<string>(IMAGE_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('high');

  // gpt-image-1.5 参数
  const [background, setBackground] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('png');

  // seedream 参数
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(false);

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [rawResponseOpen, setRawResponseOpen] = useState(false);

  // 当前选中的模型配置
  const currentModel = IMAGE_MODELS.find((m) => m.id === model) as ImageModel;

  // 提交生成
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setError('请输入 Prompt');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const request: ImageGenerationRequest = {
        model,
        prompt: prompt.trim(),
        n,
        size,
        quality,
      };

      // 添加模型专属参数
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
      {/* 左侧：表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            生成参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 模型选择 */}
          <div className="space-y-2">
            <Label>模型</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              placeholder="描述你想要生成的图片..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {/* 通用参数 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>数量</Label>
              <Input
                type="number"
                min={1}
                max={currentModel.provider === 'fal' ? 6 : 4}
                value={n}
                onChange={(e) => setN(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>尺寸</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>质量</Label>
              <Select value={quality} onValueChange={setQuality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_QUALITIES.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* gpt-image-1.5 专属参数：背景 */}
          {currentModel.params.includes('background') && (
            <div className="space-y-2">
              <Label>背景</Label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_OPTIONS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 通用参数：输出格式 */}
          {currentModel.params.includes('output_format') && (
            <div className="space-y-2">
              <Label>输出格式</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fal 通用参数：seed + 安全检查 */}
          {currentModel.params.includes('seed') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seed (可选)</Label>
                <Input
                  type="number"
                  placeholder="随机"
                  value={seed ?? ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="safety"
                  checked={enableSafetyChecker}
                  onCheckedChange={setEnableSafetyChecker}
                />
                <Label htmlFor="safety">安全检查</Label>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* 提交按钮 */}
          <Button onClick={handleSubmit} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '生成图片'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 右侧：结果 */}
      <Card>
        <CardHeader>
          <CardTitle>生成结果</CardTitle>
        </CardHeader>
        <CardContent>
          {!result && !loading && (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              点击"生成图片"开始
            </div>
          )}

          {loading && (
            <div className="flex h-64 items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* 图片展示 */}
              <div className="grid grid-cols-2 gap-4">
                {result.response.data.map((img, index) => (
                  <div key={index} className="overflow-hidden rounded-lg border bg-muted">
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={`Generated ${index + 1}`}
                        className="h-auto w-full object-cover"
                      />
                    ) : img.b64_json ? (
                      <img
                        src={`data:image/png;base64,${img.b64_json}`}
                        alt={`Generated ${index + 1}`}
                        className="h-auto w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center text-muted-foreground">
                        无图片数据
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 统计信息 */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>耗时: {(result.duration / 1000).toFixed(2)}s</span>
                <span>图片数: {result.response.data.length}</span>
              </div>

              {/* 原始响应 */}
              <Collapsible open={rawResponseOpen} onOpenChange={setRawResponseOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    {rawResponseOpen ? (
                      <ArrowUp className="mr-2 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-2 h-4 w-4" />
                    )}
                    原始响应
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
                    {JSON.stringify(result.response, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
