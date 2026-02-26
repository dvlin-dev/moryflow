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
  type ImageModel,
} from '../const';

interface ImageGeneratorFormProps {
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
  currentModel: ImageModel;
  onModelChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onNChange: (value: number) => void;
  onSizeChange: (value: string) => void;
  onQualityChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
  onOutputFormatChange: (value: string) => void;
  onSeedChange: (value: number | undefined) => void;
  onEnableSafetyCheckerChange: (value: boolean) => void;
  onSubmit: () => void;
}

function getSubmitButtonLabel(loading: boolean): string {
  return loading ? '生成中...' : '生成图片';
}

export function ImageGeneratorForm({
  model,
  prompt,
  n,
  size,
  quality,
  background,
  outputFormat,
  seed,
  enableSafetyChecker,
  loading,
  error,
  currentModel,
  onModelChange,
  onPromptChange,
  onNChange,
  onSizeChange,
  onQualityChange,
  onBackgroundChange,
  onOutputFormatChange,
  onSeedChange,
  onEnableSafetyCheckerChange,
  onSubmit,
}: ImageGeneratorFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>模型</Label>
        <Select value={model} onValueChange={onModelChange}>
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
          onChange={(event) => onPromptChange(event.target.value)}
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
            onChange={(event) => onNChange(Number.parseInt(event.target.value, 10) || 1)}
          />
        </div>
        <div className="space-y-2">
          <Label>尺寸</Label>
          <Select value={size} onValueChange={onSizeChange}>
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
          <Select value={quality} onValueChange={onQualityChange}>
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
          <Select value={background} onValueChange={onBackgroundChange}>
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
          <Select value={outputFormat} onValueChange={onOutputFormatChange}>
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
                onSeedChange(event.target.value ? Number.parseInt(event.target.value, 10) : undefined)
              }
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="safety"
              checked={enableSafetyChecker}
              onCheckedChange={onEnableSafetyCheckerChange}
            />
            <Label htmlFor="safety">安全检查</Label>
          </div>
        </div>
      )}

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Button onClick={onSubmit} disabled={loading || !prompt.trim()} className="w-full">
        {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && <Image className="mr-2 h-4 w-4" />}
        {getSubmitButtonLabel(loading)}
      </Button>
    </div>
  );
}
