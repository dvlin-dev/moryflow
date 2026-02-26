/**
 * Scrape 表单组件
 *
 * [PROPS]: ScrapeFormProps
 * [EMITS]: onSubmit, onKeyChange
 * [POS]: Scrape Playground 主表单入口（容器编排层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@moryflow/ui';
import type { ApiKey } from '@/features/api-keys';
import {
  ApiKeySelector,
  DEVICE_PRESETS,
  scrapeFormDefaults,
  scrapeFormSchema,
  type DevicePreset,
  type ScrapeFormat,
  type ScrapeFormValues,
  type ScrapeRequest,
} from '@/features/playground-shared';
import { buildScrapeRequest } from './scrape-form-request-mapper';
import { ScrapeScreenshotSection } from './scrape-form-screenshot-section';
import {
  ScrapeContentSection,
  ScrapeViewportSection,
  ScrapeWaitSection,
} from './scrape-form-advanced-sections';
import { ScrapeFormatSection, ScrapeUrlField } from './scrape-form-sections';

interface ScrapeFormProps {
  apiKeys: ApiKey[];
  selectedKeyId: string;
  onKeyChange: (keyId: string) => void;
  onSubmit: (request: ScrapeRequest) => void;
  isLoading?: boolean;
}

type ScrapeSectionKey = 'format' | 'viewport' | 'content' | 'wait' | 'screenshot';

type ScrapeSectionState = Record<ScrapeSectionKey, boolean>;

const initialSectionState: ScrapeSectionState = {
  format: true,
  viewport: false,
  content: false,
  wait: false,
  screenshot: false,
};

export function ScrapeForm({
  apiKeys,
  selectedKeyId,
  onKeyChange,
  onSubmit,
  isLoading,
}: ScrapeFormProps) {
  const [sectionState, setSectionState] = useState<ScrapeSectionState>(initialSectionState);

  const form = useForm<ScrapeFormValues>({
    resolver: zodResolver(scrapeFormSchema),
    defaultValues: scrapeFormDefaults,
  });

  const formats = useWatch({ control: form.control, name: 'formats' }) ?? scrapeFormDefaults.formats;
  const device = useWatch({ control: form.control, name: 'device' }) ?? scrapeFormDefaults.device;

  const setSectionOpen = (section: ScrapeSectionKey, nextOpen: boolean) => {
    setSectionState((previousState) => ({
      ...previousState,
      [section]: nextOpen,
    }));
  };

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
    let nextFormats: ScrapeFormat[];

    if (currentFormats.includes(format)) {
      nextFormats = currentFormats.filter((item) => item !== format);
    } else {
      nextFormats = [...currentFormats, format];
    }

    form.setValue('formats', nextFormats, { shouldValidate: true });
  };

  const handleFormSubmit = (values: ScrapeFormValues) => {
    const request = buildScrapeRequest(values);
    onSubmit(request);
  };

  const selectedKey = apiKeys.find((key) => key.id === selectedKeyId);
  const hasActiveKey = Boolean(selectedKey?.isActive);
  const canSubmit = Boolean(hasActiveKey && formats.length > 0 && !isLoading);

  const renderScreenshotSection = () => {
    if (!formats.includes('screenshot')) {
      return null;
    }

    return (
      <ScrapeScreenshotSection
        form={form}
        open={sectionState.screenshot}
        onOpenChange={(nextOpen) => setSectionOpen('screenshot', nextOpen)}
        isLoading={isLoading}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <ApiKeySelector
          apiKeys={apiKeys}
          selectedKeyId={selectedKeyId}
          onKeyChange={onKeyChange}
          disabled={isLoading}
        />

        <ScrapeUrlField form={form} canSubmit={canSubmit} isLoading={isLoading} />

        <ScrapeFormatSection
          form={form}
          formats={formats}
          open={sectionState.format}
          onOpenChange={(nextOpen) => setSectionOpen('format', nextOpen)}
          onFormatToggle={handleFormatToggle}
          isLoading={isLoading}
        />

        <ScrapeViewportSection
          form={form}
          device={device}
          open={sectionState.viewport}
          onOpenChange={(nextOpen) => setSectionOpen('viewport', nextOpen)}
          onDeviceChange={handleDeviceChange}
          isLoading={isLoading}
        />

        <ScrapeContentSection
          form={form}
          open={sectionState.content}
          onOpenChange={(nextOpen) => setSectionOpen('content', nextOpen)}
          isLoading={isLoading}
        />

        <ScrapeWaitSection
          form={form}
          open={sectionState.wait}
          onOpenChange={(nextOpen) => setSectionOpen('wait', nextOpen)}
          isLoading={isLoading}
        />

        {renderScreenshotSection()}
      </form>
    </Form>
  );
}
