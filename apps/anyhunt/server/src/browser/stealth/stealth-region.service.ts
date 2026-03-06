/**
 * [INPUT]: URL 字符串
 * [OUTPUT]: RegionSignal (locale/timezone/acceptLanguage) 或 null
 * [POS]: 从 URL TLD 推断区域信号，用于 context 创建和 Accept-Language header 更新
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { RegionSignal } from './stealth.types';

interface RegionMapping {
  locale: string;
  timezone: string;
}

// TLD → 区域映射表（20 地区）
const TLD_REGION_MAP: Record<string, RegionMapping> = {
  tw: { locale: 'zh-TW', timezone: 'Asia/Taipei' },
  cn: { locale: 'zh-CN', timezone: 'Asia/Shanghai' },
  hk: { locale: 'zh-HK', timezone: 'Asia/Hong_Kong' },
  jp: { locale: 'ja-JP', timezone: 'Asia/Tokyo' },
  kr: { locale: 'ko-KR', timezone: 'Asia/Seoul' },
  de: { locale: 'de-DE', timezone: 'Europe/Berlin' },
  fr: { locale: 'fr-FR', timezone: 'Europe/Paris' },
  it: { locale: 'it-IT', timezone: 'Europe/Rome' },
  es: { locale: 'es-ES', timezone: 'Europe/Madrid' },
  pt: { locale: 'pt-PT', timezone: 'Europe/Lisbon' },
  br: { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
  ru: { locale: 'ru-RU', timezone: 'Europe/Moscow' },
  in: { locale: 'hi-IN', timezone: 'Asia/Kolkata' },
  th: { locale: 'th-TH', timezone: 'Asia/Bangkok' },
  vn: { locale: 'vi-VN', timezone: 'Asia/Ho_Chi_Minh' },
  id: { locale: 'id-ID', timezone: 'Asia/Jakarta' },
  my: { locale: 'ms-MY', timezone: 'Asia/Kuala_Lumpur' },
  sg: { locale: 'en-SG', timezone: 'Asia/Singapore' },
  au: { locale: 'en-AU', timezone: 'Australia/Sydney' },
  uk: { locale: 'en-GB', timezone: 'Europe/London' },
};

// 复合 TLD（需要提取倒数第二段）
const COMPOUND_TLDS = new Set([
  'co.jp',
  'co.kr',
  'co.uk',
  'co.in',
  'co.id',
  'co.th',
  'com.tw',
  'com.hk',
  'com.cn',
  'com.br',
  'com.au',
  'com.sg',
  'com.my',
  'com.vn',
  'org.tw',
  'net.tw',
]);

@Injectable()
export class StealthRegionService {
  /**
   * 从 URL 推断区域信号
   * 返回 null 表示无法推断（.com/.org/.net 等通用 TLD）
   */
  resolveRegion(url: string): RegionSignal | null {
    const tld = this.extractTld(url);
    if (!tld) return null;

    const mapping = TLD_REGION_MAP[tld];
    if (!mapping) return null;

    return {
      locale: mapping.locale,
      timezone: mapping.timezone,
      acceptLanguage: this.buildAcceptLanguage(mapping.locale),
    };
  }

  /**
   * 从 URL 提取国家级 TLD
   * 支持复合 TLD（.co.jp → jp, .com.tw → tw）
   */
  private extractTld(url: string): string | null {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const parts = hostname.split('.');
      if (parts.length < 2) return null;

      // 检查复合 TLD（co.jp, com.tw 等）
      if (parts.length >= 3) {
        const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
        if (COMPOUND_TLDS.has(lastTwo)) {
          return parts[parts.length - 1];
        }
      }

      return parts[parts.length - 1];
    } catch {
      return null;
    }
  }

  /**
   * 构建 Accept-Language header
   * 例：zh-TW → "zh-TW,zh;q=0.9,en;q=0.8"
   */
  private buildAcceptLanguage(locale: string): string {
    const base = locale.split('-')[0];
    if (!base || base === locale) {
      return `${locale},en;q=0.8`;
    }
    if (base === 'en') {
      return `${locale},en;q=0.9`;
    }
    return `${locale},${base};q=0.9,en;q=0.8`;
  }
}
