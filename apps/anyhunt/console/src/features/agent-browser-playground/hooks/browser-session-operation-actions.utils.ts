/**
 * [PROVIDES]: BrowserSession 操作编排通用工具（JSON 解析 + context option 错误映射）
 * [DEPENDS]: browser-context-options / RHF form
 * [POS]: 操作 hooks 的共享辅助方法
 */

import type { UseFormReturn } from 'react-hook-form';
import type { BrowserContextOptionError } from '../browser-context-options';
import type { BrowserWindowsValues } from '../schemas';

export const parseJson = <T,>(value?: string): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const parseJsonArray = <T,>(value?: string): T[] | null => {
  const parsed = parseJson<unknown>(value);
  return Array.isArray(parsed) ? (parsed as T[]) : null;
};

export const parseJsonObject = <T extends Record<string, unknown>>(value?: string): T | null => {
  const parsed = parseJson<unknown>(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as T;
};

export const applyBrowserContextOptionErrors = (
  form: UseFormReturn<BrowserWindowsValues>,
  errors: BrowserContextOptionError[]
) => {
  errors.forEach((error) => {
    switch (error.field) {
      case 'permissionsJson':
        form.setError('permissionsJson', { message: error.message });
        break;
      case 'headersJson':
        form.setError('headersJson', { message: error.message });
        break;
      case 'geolocation':
        form.setError('geolocationLat', { message: error.message });
        form.setError('geolocationLng', { message: error.message });
        break;
      case 'httpCredentials':
        form.setError('httpUsername', { message: error.message });
        form.setError('httpPassword', { message: error.message });
        break;
      default:
        break;
    }
  });
};
