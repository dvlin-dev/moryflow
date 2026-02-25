/**
 * [PROPS]: apiKeys, selectedKeyId, onKeyChange, onSubmit, isLoading
 * [EMITS]: onSubmit(data)
 * [POS]: Embed 参数表单组件（Lucide icons direct render）
 *
 * 测试 URL:
 * - Twitter/X: https://x.com/OpenAI/status/2003594025098785145
 * - YouTube:   https://www.youtube.com/watch?v=gzneGhpXwjU
 * - Vimeo:     https://vimeo.com/962022830
 * - Spotify:   https://open.spotify.com/track/2plbrEY59IikOBgBGLjaoe
 * - SoundCloud: https://soundcloud.com/flume/smoke-and-retribution-feat-vince-staples-kucka
 */
import { useState } from 'react';
import { Link, Loader } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import type { EmbedFormData } from '../types';
import type { EmbedTheme } from '@moryflow/embed-react';

interface EmbedFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  onSubmit: (data: EmbedFormData) => void;
  isLoading?: boolean;
}

export function EmbedForm({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  onSubmit,
  isLoading,
}: EmbedFormProps) {
  const [url, setUrl] = useState('');
  const [maxWidth, setMaxWidth] = useState<number | undefined>(550);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const [theme, setTheme] = useState<EmbedTheme | 'auto'>('auto');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onSubmit({
      url: url.trim(),
      maxWidth,
      maxHeight,
      theme: theme === 'auto' ? undefined : theme,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Key 选择 */}
      <div className="space-y-2">
        <Label htmlFor="api-key">API Key</Label>
        <Select value={selectedKeyId} onValueChange={onKeyChange}>
          <SelectTrigger id="api-key">
            <SelectValue placeholder="Select API Key" />
          </SelectTrigger>
          <SelectContent>
            {apiKeys.map((key) => (
              <SelectItem key={key.id} value={key.id}>
                {key.name}
                {!key.isActive && ' (Inactive)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* URL 输入 */}
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://twitter.com/elonmusk/status/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Supports Twitter/X, YouTube, Vimeo, Spotify, SoundCloud
        </p>
      </div>

      {/* 尺寸设置 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max-width">Max Width</Label>
          <Input
            id="max-width"
            type="number"
            min={1}
            max={4096}
            placeholder="550"
            value={maxWidth ?? ''}
            onChange={(e) => setMaxWidth(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-height">Max Height</Label>
          <Input
            id="max-height"
            type="number"
            min={1}
            max={4096}
            placeholder="Optional"
            value={maxHeight ?? ''}
            onChange={(e) => setMaxHeight(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* 主题选择 */}
      <div className="space-y-2">
        <Label htmlFor="theme">Theme (Twitter only)</Label>
        <Select value={theme} onValueChange={(v) => setTheme(v as EmbedTheme | 'auto')}>
          <SelectTrigger id="theme">
            <SelectValue placeholder="Auto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 提交按钮 */}
      <Button type="submit" className="w-full" disabled={isLoading || !url.trim()}>
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Fetching...
          </>
        ) : (
          <>
            <Link className="mr-2 h-4 w-4" />
            Fetch Embed
          </>
        )}
      </Button>
    </form>
  );
}
