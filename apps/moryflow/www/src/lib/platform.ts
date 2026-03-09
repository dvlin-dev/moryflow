/**
 * [PROVIDES]: 平台检测工具函数与 React hook
 * [DEPENDS]: 无
 * [POS]: 官网平台检测基础设施（SSR 安全）
 */

import { useState, useEffect } from 'react';

export type Platform = 'mac' | 'win';
export type DetectedPlatform = Platform | 'unknown';

/** SSR-safe platform detection from user agent */
export function detectPlatform(): DetectedPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('win')) return 'win';
  return 'unknown';
}

/** React hook: detects platform on mount, returns 'unknown' during SSR */
export function usePlatformDetection(): DetectedPlatform {
  const [platform, setPlatform] = useState<DetectedPlatform>('unknown');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return platform;
}
