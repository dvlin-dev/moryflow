/**
 * [DEFINES]: Stealth 模块公共类型
 * [USED_BY]: stealth-patches.ts, stealth-cdp.service.ts, stealth-region.service.ts, risk-detection.service.ts
 * [POS]: Browser stealth 类型边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

/** init-script 补丁构建参数 */
export interface StealthScriptOptions {
  locale?: string;
  userAgent?: string;
  acceptLanguage?: string;
}

/** 风险信号（验证页/拦截页检测结果） */
export interface RiskSignal {
  /** 信号类型标识 */
  code:
    | 'captcha_interstitial'
    | 'verification_interstitial'
    | 'bot_challenge'
    | 'access_gate';
  /** 检测来源 */
  source: 'url' | 'title';
  /** 匹配的证据文本 */
  evidence: string;
  /** 置信度 0-1 */
  confidence: number;
}

/** 区域信号推断结果 */
export interface RegionSignal {
  locale: string;
  timezone: string;
  acceptLanguage: string;
}
