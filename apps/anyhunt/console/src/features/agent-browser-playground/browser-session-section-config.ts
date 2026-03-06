/**
 * [DEFINES]: BrowserSessionSection + default sections + default open states
 * [USED_BY]: BrowserSessionPanel / section state hooks
 * [POS]: Browser Session 分区配置中心
 */

export type BrowserSessionSection =
  | 'session'
  | 'open'
  | 'snapshot'
  | 'delta'
  | 'action'
  | 'actionBatch'
  | 'screenshot'
  | 'tabs'
  | 'windows'
  | 'intercept'
  | 'headers'
  | 'network'
  | 'diagnostics'
  | 'storage'
  | 'profile'
  | 'stream'
  | 'cdp';

export const defaultBrowserSessionSections: BrowserSessionSection[] = [
  'session',
  'open',
  'snapshot',
  'delta',
  'action',
  'actionBatch',
  'screenshot',
  'tabs',
  'windows',
  'intercept',
  'headers',
  'network',
  'diagnostics',
  'storage',
  'profile',
  'stream',
  'cdp',
];

export const defaultBrowserSessionSectionOpenState: Record<BrowserSessionSection, boolean> = {
  session: true,
  open: true,
  snapshot: false,
  delta: false,
  action: false,
  actionBatch: false,
  screenshot: false,
  tabs: false,
  windows: false,
  intercept: false,
  headers: false,
  network: false,
  diagnostics: false,
  storage: false,
  profile: false,
  stream: false,
  cdp: false,
};
