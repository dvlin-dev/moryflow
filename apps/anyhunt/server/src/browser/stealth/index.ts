/**
 * [PROVIDES]: stealth 模块统一导出
 * [POS]: Browser 反检测能力入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
