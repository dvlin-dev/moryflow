/**
 * [INPUT]: ScrapeFormValues
 * [OUTPUT]: ScrapeRequest
 * [POS]: Scrape Playground 表单值 -> API 请求映射
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type {
  DevicePreset,
  ScrapeFormValues,
  ScrapeRequest,
  ScreenshotOptions,
} from '@/features/playground-shared';

function parseTagList(value: string): string[] | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const tags = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (tags.length === 0) {
    return undefined;
  }

  return tags;
}

function parseWaitForValue(value: string): number | string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const maybeNumber = Number(value);
  if (Number.isNaN(maybeNumber)) {
    return value.trim();
  }

  return maybeNumber;
}

function buildScreenshotOptions(values: ScrapeFormValues): ScreenshotOptions {
  return {
    fullPage: values.screenshotFullPage,
    format: values.screenshotFormat,
    quality: values.screenshotQuality,
    response: values.screenshotResponse,
  };
}

export function buildScrapeRequest(values: ScrapeFormValues): ScrapeRequest {
  const request: ScrapeRequest = {
    url: values.url,
    formats: values.formats,
    onlyMainContent: values.onlyMainContent,
    timeout: values.timeout,
  };

  if (values.device === 'custom') {
    request.viewport = { width: values.width, height: values.height };
  } else {
    request.device = values.device as DevicePreset;
  }

  if (values.mobile) {
    request.mobile = true;
  }

  if (values.darkMode) {
    request.darkMode = true;
  }

  const includeTags = parseTagList(values.includeTags);
  if (includeTags) {
    request.includeTags = includeTags;
  }

  const excludeTags = parseTagList(values.excludeTags);
  if (excludeTags) {
    request.excludeTags = excludeTags;
  }

  const waitFor = parseWaitForValue(values.waitFor);
  if (waitFor !== undefined) {
    request.waitFor = waitFor;
  }

  if (values.formats.includes('screenshot')) {
    request.screenshotOptions = buildScreenshotOptions(values);
  }

  return request;
}
