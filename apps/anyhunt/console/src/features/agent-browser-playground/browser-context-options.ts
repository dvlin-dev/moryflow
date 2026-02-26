/**
 * [PROVIDES]: buildBrowserContextOptions - Session/Window 共用 options 构建与校验
 * [DEPENDS]: BrowserSessionValues schema type
 * [POS]: Agent Browser Playground 请求参数映射层（去重 Session/Window 重复逻辑）
 */

import type { BrowserSessionValues } from './schemas';

type BrowserContextOptionValues = Pick<
  BrowserSessionValues,
  | 'viewportWidth'
  | 'viewportHeight'
  | 'device'
  | 'userAgent'
  | 'locale'
  | 'timezoneId'
  | 'colorScheme'
  | 'reducedMotion'
  | 'offline'
  | 'permissionsJson'
  | 'headersJson'
  | 'geolocationLat'
  | 'geolocationLng'
  | 'geolocationAccuracy'
  | 'httpUsername'
  | 'httpPassword'
  | 'acceptDownloads'
  | 'recordVideoEnabled'
  | 'recordVideoWidth'
  | 'recordVideoHeight'
>;

const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const parseJsonArray = <T,>(value?: string): T[] | null => {
  const parsed = parseJson<unknown>(value);
  return Array.isArray(parsed) ? (parsed as T[]) : null;
};

const parseJsonObject = <T extends Record<string, unknown>>(value?: string): T | null => {
  const parsed = parseJson<unknown>(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as T;
};

export type BrowserContextOptionError = {
  field: 'permissionsJson' | 'headersJson' | 'geolocation' | 'httpCredentials';
  message: string;
};

export type BuildBrowserContextOptionsResult = {
  options: Record<string, unknown> | null;
  errors: BrowserContextOptionError[];
};

export function buildBrowserContextOptions(
  values: BrowserContextOptionValues,
  baseOptions: Record<string, unknown> = {}
): BuildBrowserContextOptionsResult {
  const errors: BrowserContextOptionError[] = [];

  const permissions = parseJsonArray<string>(values.permissionsJson ?? '');
  if (values.permissionsJson && !permissions) {
    errors.push({ field: 'permissionsJson', message: 'Invalid JSON array' });
  }

  const headers = parseJsonObject<Record<string, string>>(values.headersJson ?? '');
  if (values.headersJson && !headers) {
    errors.push({ field: 'headersJson', message: 'Invalid JSON object' });
  }

  const hasGeoLat = values.geolocationLat !== undefined;
  const hasGeoLng = values.geolocationLng !== undefined;
  if ((hasGeoLat || hasGeoLng) && (!hasGeoLat || !hasGeoLng)) {
    errors.push({ field: 'geolocation', message: 'Latitude and longitude are required' });
  }

  const hasHttpUser = Boolean(values.httpUsername);
  const hasHttpPass = Boolean(values.httpPassword);
  if (hasHttpUser !== hasHttpPass) {
    errors.push({ field: 'httpCredentials', message: 'Username and password are required' });
  }

  if (errors.length > 0) {
    return { options: null, errors };
  }

  const options: Record<string, unknown> = { ...baseOptions };

  if (values.viewportWidth && values.viewportHeight) {
    options.viewport = {
      width: values.viewportWidth,
      height: values.viewportHeight,
    };
  }

  if (values.device?.trim()) {
    options.device = values.device.trim();
  }

  if (values.userAgent?.trim()) {
    options.userAgent = values.userAgent.trim();
  }

  if (values.locale?.trim()) {
    options.locale = values.locale.trim();
  }

  if (values.timezoneId?.trim()) {
    options.timezoneId = values.timezoneId.trim();
  }

  if (values.colorScheme) {
    options.colorScheme = values.colorScheme;
  }

  if (values.reducedMotion) {
    options.reducedMotion = values.reducedMotion;
  }

  options.offline = values.offline;
  options.acceptDownloads = values.acceptDownloads;

  if (permissions) {
    options.permissions = permissions;
  }

  if (headers) {
    options.headers = headers;
  }

  if (hasGeoLat && hasGeoLng) {
    options.geolocation = {
      latitude: values.geolocationLat as number,
      longitude: values.geolocationLng as number,
      accuracy: values.geolocationAccuracy,
    };
  }

  if (hasHttpUser && hasHttpPass) {
    options.httpCredentials = {
      username: values.httpUsername ?? '',
      password: values.httpPassword ?? '',
    };
  }

  if (values.recordVideoEnabled) {
    options.recordVideo = {
      enabled: true,
      width: values.recordVideoWidth,
      height: values.recordVideoHeight,
    };
  }

  return { options, errors: [] };
}
