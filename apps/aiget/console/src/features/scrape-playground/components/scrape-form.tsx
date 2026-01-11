/**
 * Scrape 表单组件
 * 使用 react-hook-form + zod 验证
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@aiget/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  CollapsibleSection,
  DEVICE_PRESETS,
  scrapeFormSchema,
  scrapeFormDefaults,
  type ScrapeFormValues,
  type ScrapeFormat,
  type ScrapeRequest,
  type DevicePreset,
  type ScreenshotOptions,
} from '@/features/playground-shared';

interface ScrapeFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string | null) => void;
  onSubmit: (request: ScrapeRequest) => void;
  isLoading?: boolean;
}

const FORMAT_OPTIONS: { value: ScrapeFormat; label: string; description: string }[] = [
  { value: 'markdown', label: 'Markdown', description: 'Clean readable text' },
  { value: 'html', label: 'HTML', description: 'Processed HTML' },
  { value: 'rawHtml', label: 'Raw HTML', description: 'Original HTML' },
  { value: 'links', label: 'Links', description: 'All page links' },
  { value: 'screenshot', label: 'Screenshot', description: 'Page image' },
  { value: 'pdf', label: 'PDF', description: 'PDF document' },
];

export function ScrapeForm({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  onSubmit,
  isLoading,
}: ScrapeFormProps) {
  // 折叠状态
  const [formatOpen, setFormatOpen] = useState(true);
  const [viewportOpen, setViewportOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [waitOpen, setWaitOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: scrapeFormDefaults,
  });

  const formats = form.watch('formats');
  const device = form.watch('device');

  const handleDeviceChange = (value: string) => {
    form.setValue('device', value as DevicePreset | 'custom');
    if (value !== 'custom' && value in DEVICE_PRESETS) {
      const preset = DEVICE_PRESETS[value as DevicePreset];
      form.setValue('width', preset.width);
      form.setValue('height', preset.height);
      form.setValue('mobile', value === 'mobile');
    }
  };

  const handleFormatToggle = (format: ScrapeFormat) => {
    const currentFormats = form.getValues('formats');
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter((f) => f !== format)
      : [...currentFormats, format];
    form.setValue('formats', newFormats as ScrapeFormat[], { shouldValidate: true });
  };

  const handleFormSubmit = (values: ScrapeFormValues) => {
    const request: ScrapeRequest = {
      url: values.url,
      formats: values.formats,
      onlyMainContent: values.onlyMainContent,
      timeout: values.timeout,
    };

    // 视口设置
    if (values.device !== 'custom') {
      request.device = values.device as DevicePreset;
    } else {
      request.viewport = { width: values.width, height: values.height };
    }

    if (values.mobile) request.mobile = true;
    if (values.darkMode) request.darkMode = true;

    // 内容选项
    if (values.includeTags.trim()) {
      request.includeTags = values.includeTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (values.excludeTags.trim()) {
      request.excludeTags = values.excludeTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // 等待选项
    if (values.waitFor.trim()) {
      const numWait = Number(values.waitFor);
      request.waitFor = isNaN(numWait) ? values.waitFor.trim() : numWait;
    }

    // 截图选项
    if (values.formats.includes('screenshot')) {
      const options: ScreenshotOptions = {
        fullPage: values.screenshotFullPage,
        format: values.screenshotFormat,
        quality: values.screenshotQuality,
        response: values.screenshotResponse,
      };
      request.screenshotOptions = options;
    }

    onSubmit(request);
  };

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);
  const hasActiveKey = selectedKey?.isActive;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* API Key 选择 */}
        <ApiKeySelector
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onKeyChange={onKeyChange}
          disabled={isLoading}
        />

        {/* URL 输入 */}
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target URL</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    className="flex-1"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <Button type="submit" disabled={isLoading || !hasActiveKey || formats.length === 0}>
                  {isLoading ? (
                    <Icon icon={Loading01Icon} className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon={Search01Icon} className="h-4 w-4" />
                  )}
                  <span className="ml-2">Scrape</span>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 输出格式 */}
        <CollapsibleSection title="Output Formats" open={formatOpen} onOpenChange={setFormatOpen}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((format) => (
              <label
                key={format.value}
                className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={formats.includes(format.value)}
                  onCheckedChange={() => handleFormatToggle(format.value)}
                  disabled={isLoading}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
              </label>
            ))}
          </div>
          {form.formState.errors.formats && (
            <p className="text-sm text-destructive mt-2">{form.formState.errors.formats.message}</p>
          )}
        </CollapsibleSection>

        {/* 视口设置 */}
        <CollapsibleSection
          title="Viewport Settings"
          open={viewportOpen}
          onOpenChange={setViewportOpen}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <FormLabel>Device Preset</FormLabel>
                <Select value={device} onValueChange={handleDeviceChange} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop (1280×800)</SelectItem>
                    <SelectItem value="tablet">Tablet (768×1024)</SelectItem>
                    <SelectItem value="mobile">Mobile (375×667)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={3840}
                        disabled={isLoading}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue('device', 'custom');
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={2160}
                        disabled={isLoading}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue('device', 'custom');
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Mobile User-Agent</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="darkMode"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Dark Mode</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* 内容选项 */}
        <CollapsibleSection
          title="Content Options"
          open={contentOpen}
          onOpenChange={setContentOpen}
        >
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="onlyMainContent"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Extract main content only</FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="includeTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Include Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="article, main, .content"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>CSS selectors, comma separated</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excludeTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exclude Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="nav, footer, .ads" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>Elements to hide/exclude</FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* 等待选项 */}
        <CollapsibleSection title="Wait Options" open={waitOpen} onOpenChange={setWaitOpen}>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="waitFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wait For</FormLabel>
                  <FormControl>
                    <Input placeholder="2000 or .dynamic-content" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormDescription>Milliseconds or CSS selector</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (ms)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1000} max={120000} disabled={isLoading} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CollapsibleSection>

        {/* 截图选项 */}
        {formats.includes('screenshot') && (
          <CollapsibleSection
            title="Screenshot Options"
            open={screenshotOpen}
            onOpenChange={setScreenshotOpen}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="screenshotFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="screenshotQuality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quality (1-100)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} disabled={isLoading} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="screenshotResponse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL (CDN Link)</SelectItem>
                          <SelectItem value="base64">Base64</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="screenshotFullPage"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Full Page Screenshot</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleSection>
        )}
      </form>
    </Form>
  );
}
