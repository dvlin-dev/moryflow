/**
 * [PROPS]: n/a（分区组件统一导出入口）
 * [EMITS]: n/a
 * [POS]: Browser Playground 分区 UI 组件聚合导出层
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { ActionBatchSection } from './browser-session-sections/action-batch-section';
import { ActionSection } from './browser-session-sections/action-section';
import { CdpSection } from './browser-session-sections/cdp-section';
import { DeltaSnapshotSection } from './browser-session-sections/delta-snapshot-section';
import { DiagnosticsSection } from './browser-session-sections/diagnostics-section';
import { HeadersSection } from './browser-session-sections/headers-section';
import { InterceptSection } from './browser-session-sections/intercept-section';
import { NetworkHistorySection } from './browser-session-sections/network-history-section';
import { OpenUrlSection } from './browser-session-sections/open-url-section';
import { ProfileSection } from './browser-session-sections/profile-section';
import { ScreenshotSection } from './browser-session-sections/screenshot-section';
import { SessionSection } from './browser-session-sections/session-section';
import { SnapshotSection } from './browser-session-sections/snapshot-section';
import { StorageSection } from './browser-session-sections/storage-section';
import { StreamingSection } from './browser-session-sections/streaming-section';
import { TabsSection } from './browser-session-sections/tabs-section';
import { WindowsSection } from './browser-session-sections/windows-section';

export {
  SessionSection,
  OpenUrlSection,
  SnapshotSection,
  DeltaSnapshotSection,
  ActionSection,
  ActionBatchSection,
  ScreenshotSection,
  TabsSection,
  WindowsSection,
  InterceptSection,
  HeadersSection,
  NetworkHistorySection,
  DiagnosticsSection,
  StorageSection,
  ProfileSection,
  StreamingSection,
  CdpSection,
};
