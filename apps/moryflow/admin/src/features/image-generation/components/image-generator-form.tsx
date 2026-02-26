import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Image, Loader } from 'lucide-react';
import {
  BACKGROUND_OPTIONS,
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  IMAGE_SIZES,
  OUTPUT_FORMATS,
} from '../const';
import { imageGeneratorMethods } from '../methods';
import { selectCurrentImageModel, useImageGeneratorStore } from '../store';

function getSubmitButtonLabel(loading: boolean): string {
  return loading ? '生成中...' : '生成图片';
}

export function ImageGeneratorForm() {
  const model = useImageGeneratorStore((state) => state.model);
  const prompt = useImageGeneratorStore((state) => state.prompt);
  const n = useImageGeneratorStore((state) => state.n);
  const size = useImageGeneratorStore((state) => state.size);
  const quality = useImageGeneratorStore((state) => state.quality);
  const background = useImageGeneratorStore((state) => state.background);
  const outputFormat = useImageGeneratorStore((state) => state.outputFormat);
  const seed = useImageGeneratorStore((state) => state.seed);
  const enableSafetyChecker = useImageGeneratorStore((state) => state.enableSafetyChecker);
  const loading = useImageGeneratorStore((state) => state.loading);
  const error = useImageGeneratorStore((state) => state.error);

  const setModel = useImageGeneratorStore((state) => state.setModel);
  const setPrompt = useImageGeneratorStore((state) => state.setPrompt);
  const setN = useImageGeneratorStore((state) => state.setN);
  const setSize = useImageGeneratorStore((state) => state.setSize);
  const setQuality = useImageGeneratorStore((state) => state.setQuality);
  const setBackground = useImageGeneratorStore((state) => state.setBackground);
  const setOutputFormat = useImageGeneratorStore((state) => state.setOutputFormat);
  const setSeed = useImageGeneratorStore((state) => state.setSeed);
  const setEnableSafetyChecker = useImageGeneratorStore((state) => state.setEnableSafetyChecker);

  const currentModel = useImageGeneratorStore(selectCurrentImageModel);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>模型</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} ({item.provider})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prompt</Label>
        <Textarea
          placeholder="描述你想要生成的图片..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>数量</Label>
          <Input
            type="number"
            min={1}
            max={currentModel.provider === 'fal' ? 6 : 4}
            value={n}
            onChange={(event) => setN(Number.parseInt(event.target.value, 10) || 1)}
          />
        </div>
        <div className="space-y-2">
          <Label>尺寸</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_SIZES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
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
              {IMAGE_QUALITIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentModel.params.includes('background') && (
        <div className="space-y-2">
          <Label>背景</Label>
          <Select value={background} onValueChange={setBackground}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BACKGROUND_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {currentModel.params.includes('output_format') && (
        <div className="space-y-2">
          <Label>输出格式</Label>
          <Select value={outputFormat} onValueChange={setOutputFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_FORMATS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {currentModel.params.includes('seed') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Seed (可选)</Label>
            <Input
              type="number"
              placeholder="随机"
              value={seed ?? ''}
              onChange={(event) =>
                setSeed(event.target.value ? Number.parseInt(event.target.value, 10) : undefined)
              }
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

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Button
        onClick={() => {
          void imageGeneratorMethods.submitImageGeneration();
        }}
        disabled={loading || !prompt.trim()}
        className="w-full"
      >
        {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Image className="mr-2 h-4 w-4" />}
        {getSubmitButtonLabel(loading)}
      </Button>
    </div>
  );
}
