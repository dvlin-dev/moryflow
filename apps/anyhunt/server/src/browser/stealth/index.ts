/**
 * [PROVIDES]: stealth 模块统一导出
 * [POS]: Browser 反检测能力入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type {
  StealthScriptOptions,
  RiskSignal,
  RegionSignal,
} from './stealth.types';

export { buildStealthScript } from './stealth-patches';

export { StealthCdpService } from './stealth-cdp.service';

export { STEALTH_CHROMIUM_ARGS } from './stealth-launch-args';

export { StealthRegionService } from './stealth-region.service';
