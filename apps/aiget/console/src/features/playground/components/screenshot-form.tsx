/**
 * 截图参数表单组件
 */
import { useState } from 'react';
import { Camera01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import {
  Button,
  Icon,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@aiget/ui';
import type {
  ScreenshotRequest,
  DevicePreset,
  ImageFormat,
  ResponseType,
  RenderMode,
} from '../types';
import type { ApiKey } from '@/features/api-keys';
import { CollapsibleSection } from './collapsible-section';

// 设备预设的默认尺寸
const DEVICE_PRESETS: Record<DevicePreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

interface ScreenshotFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  onSubmit: (request: ScreenshotRequest) => void;
  isLoading?: boolean;
}

export function ScreenshotForm({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  onSubmit,
  isLoading,
}: ScreenshotFormProps) {
  // 基础参数
  const [url, setUrl] = useState('');

  // 视口设置
  const [device, setDevice] = useState<DevicePreset | 'custom'>('desktop');
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);

  // 输出设置
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState(80);
  const [responseType, setResponseType] = useState<ResponseType>('url');
  const [includeTimings, setIncludeTimings] = useState(true);

  // 页面选项
  const [fullPage, setFullPage] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>('fast');

  // 等待选项
  const [delay, setDelay] = useState(0);
  const [timeout, setTimeout] = useState(30000);
  const [waitFor, setWaitFor] = useState('');

  // 高级选项
  const [clip, setClip] = useState('');
  const [hide, setHide] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [scripts, setScripts] = useState('');

  // 折叠状态
  const [viewportOpen, setViewportOpen] = useState(true);
  const [outputOpen, setOutputOpen] = useState(true);
  const [pageOpen, setPageOpen] = useState(false);
  const [waitOpen, setWaitOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleDeviceChange = (value: string) => {
    setDevice(value as DevicePreset | 'custom');
    if (value !== 'custom' && value in DEVICE_PRESETS) {
      const preset = DEVICE_PRESETS[value as DevicePreset];
      setWidth(preset.width);
      setHeight(preset.height);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const request: ScreenshotRequest = {
      url: url.trim(),
      width,
      height,
      format,
      quality,
      response: responseType,
      fullPage,
      darkMode,
      renderMode,
      delay,
      timeout,
      sync: true,
      includeTimings,
    };

    // 可选参数
    if (device !== 'custom') {
      request.device = device;
    }
    if (waitFor.trim()) {
      request.waitFor = waitFor.trim();
    }
    if (clip.trim()) {
      request.clip = clip.trim();
    }
    if (hide.trim()) {
      request.hide = hide
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (userAgent.trim()) {
      request.userAgent = userAgent.trim();
    }
    if (scripts.trim()) {
      request.scripts = scripts.trim();
    }

    onSubmit(request);
  };

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Key 选择 */}
      <div className="space-y-2">
        <Label>API Key</Label>
        <Select value={selectedKeyId} onValueChange={onKeyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select API Key" />
          </SelectTrigger>
          <SelectContent>
            {apiKeys.map((key) => (
              <SelectItem key={key.id} value={key.id} disabled={!key.isActive}>
                <span className="flex items-center gap-2">
                  <span>{key.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {key.keyPrefix}...
                  </span>
                  {!key.isActive && <span className="text-destructive text-xs">(Disabled)</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* URL 输入 */}
      <div className="space-y-2">
        <Label htmlFor="url">Target URL</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !url.trim() || !selectedKey?.isActive}>
            {isLoading ? (
              <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
            ) : (
              <Icon icon={Camera01Icon} className="h-4 w-4" />
            )}
            <span className="ml-2">Screenshot</span>
          </Button>
        </div>
      </div>

      {/* 视口设置 */}
      <CollapsibleSection
        title="Viewport Settings"
        open={viewportOpen}
        onOpenChange={setViewportOpen}
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Device Preset</Label>
            <Select value={device} onValueChange={handleDeviceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop (1280×720)</SelectItem>
                <SelectItem value="tablet">Tablet (768×1024)</SelectItem>
                <SelectItem value="mobile">Mobile (375×667)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (px)</Label>
            <Input
              id="width"
              type="number"
              min={100}
              max={3840}
              value={width}
              onChange={(e) => {
                setWidth(Number(e.target.value));
                setDevice('custom');
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (px)</Label>
            <Input
              id="height"
              type="number"
              min={100}
              max={2160}
              value={height}
              onChange={(e) => {
                setHeight(Number(e.target.value));
                setDevice('custom');
              }}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 输出设置 */}
      <CollapsibleSection title="Output Settings" open={outputOpen} onOpenChange={setOutputOpen}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality (1-100)</Label>
              <Input
                id="quality"
                type="number"
                min={1}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Response Type</Label>
              <Select
                value={responseType}
                onValueChange={(v) => setResponseType(v as ResponseType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL (CDN Link)</SelectItem>
                  <SelectItem value="base64">Base64</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="includeTimings"
              checked={includeTimings}
              onCheckedChange={setIncludeTimings}
            />
            <Label htmlFor="includeTimings">Include detailed timing stats</Label>
          </div>
        </div>
      </CollapsibleSection>

      {/* 页面选项 */}
      <CollapsibleSection title="Page Options" open={pageOpen} onOpenChange={setPageOpen}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Render Mode</Label>
            <Select value={renderMode} onValueChange={(v) => setRenderMode(v as RenderMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">Fast (Speed Priority)</SelectItem>
                <SelectItem value="complete">Complete (Content Priority)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use "Complete" mode for SPA websites with loading states
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch id="fullPage" checked={fullPage} onCheckedChange={setFullPage} />
              <Label htmlFor="fullPage">Full Page Screenshot</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
              <Label htmlFor="darkMode">Dark Mode</Label>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 等待选项 */}
      <CollapsibleSection title="Wait Options" open={waitOpen} onOpenChange={setWaitOpen}>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="delay">Delay (ms)</Label>
            <Input
              id="delay"
              type="number"
              min={0}
              max={10000}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              min={1000}
              max={60000}
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waitFor">Wait for Selector</Label>
            <Input
              id="waitFor"
              placeholder=".content, #main"
              value={waitFor}
              onChange={(e) => setWaitFor(e.target.value)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 高级选项 */}
      <CollapsibleSection
        title="Advanced Options"
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clip">Clip Selector</Label>
              <Input
                id="clip"
                placeholder=".main-content"
                value={clip}
                onChange={(e) => setClip(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Capture only the specified element area
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hide">Hide Elements</Label>
              <Input
                id="hide"
                placeholder=".ads, .popup, #cookie-banner"
                value={hide}
                onChange={(e) => setHide(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple selectors with commas
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="userAgent">Custom User-Agent</Label>
            <Input
              id="userAgent"
              placeholder="Mozilla/5.0 ..."
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scripts">Custom Scripts</Label>
            <Textarea
              id="scripts"
              placeholder="document.body.style.background = 'white';"
              value={scripts}
              onChange={(e) => setScripts(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              JavaScript code to execute before screenshot (requires paid plan)
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </form>
  );
}
