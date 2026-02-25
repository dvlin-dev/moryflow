/**
 * [INPUT]: URL + Title 字符串
 * [OUTPUT]: RiskSignal[] — 检测到的风险信号
 * [POS]: 验证页/拦截页检测，纯函数逻辑，无外部依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { RiskSignal } from '../stealth';

interface RiskPattern {
  pattern: string;
  code: RiskSignal['code'];
  confidence: number;
}

const URL_PATTERNS: RiskPattern[] = [
  {
    pattern: '/verify/captcha',
    code: 'captcha_interstitial',
    confidence: 0.98,
  },
  { pattern: 'scene=crawler', code: 'bot_challenge', confidence: 0.99 },
  { pattern: 'recaptcha', code: 'captcha_interstitial', confidence: 0.97 },
  { pattern: 'hcaptcha', code: 'captcha_interstitial', confidence: 0.97 },
  { pattern: '/captcha/', code: 'captcha_interstitial', confidence: 0.95 },
  { pattern: '/challenge/', code: 'bot_challenge', confidence: 0.9 },
  { pattern: 'cf_chl_opt', code: 'bot_challenge', confidence: 0.98 },
  { pattern: '/cdn-cgi/challenge', code: 'bot_challenge', confidence: 0.99 },
  { pattern: 'arkose', code: 'captcha_interstitial', confidence: 0.96 },
  { pattern: 'access-denied', code: 'access_gate', confidence: 0.85 },
];

const TITLE_PATTERNS: RiskPattern[] = [
  {
    pattern: 'just a moment',
    code: 'verification_interstitial',
    confidence: 0.95,
  },
  {
    pattern: 'checking your browser',
    code: 'verification_interstitial',
    confidence: 0.97,
  },
  {
    pattern: 'attention required',
    code: 'verification_interstitial',
    confidence: 0.93,
  },
  { pattern: 'please verify', code: 'captcha_interstitial', confidence: 0.92 },
  {
    pattern: 'are you a robot',
    code: 'captcha_interstitial',
    confidence: 0.96,
  },
  { pattern: '人机验证', code: 'captcha_interstitial', confidence: 0.95 },
  { pattern: '安全验证', code: 'verification_interstitial', confidence: 0.93 },
  { pattern: 'access denied', code: 'access_gate', confidence: 0.9 },
  { pattern: '403 forbidden', code: 'access_gate', confidence: 0.88 },
  { pattern: 'bot detection', code: 'bot_challenge', confidence: 0.95 },
];

@Injectable()
export class RiskDetectionService {
  /**
   * 检测页面是否为验证页/拦截页
   * 纯函数：输入 URL + Title，输出检测到的风险信号
   */
  detect(url: string, title: string): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    for (const pattern of URL_PATTERNS) {
      if (urlLower.includes(pattern.pattern)) {
        signals.push({
          code: pattern.code,
          source: 'url',
          evidence: pattern.pattern,
          confidence: pattern.confidence,
        });
      }
    }

    for (const pattern of TITLE_PATTERNS) {
      if (titleLower.includes(pattern.pattern)) {
        signals.push({
          code: pattern.code,
          source: 'title',
          evidence: pattern.pattern,
          confidence: pattern.confidence,
        });
      }
    }

    return this.deduplicate(signals);
  }

  /**
   * 按 code 去重，保留最高置信度
   */
  private deduplicate(signals: RiskSignal[]): RiskSignal[] {
    const map = new Map<string, RiskSignal>();
    for (const signal of signals) {
      const key = `${signal.code}:${signal.source}`;
      const existing = map.get(key);
      if (!existing || signal.confidence > existing.confidence) {
        map.set(key, signal);
      }
    }
    return [...map.values()].sort((a, b) => b.confidence - a.confidence);
  }
}
