/**
 * Browser DTO Exports
 *
 * [PROVIDES]: 所有 Browser API 的请求/响应类型
 * [POS]: 按需导出，减少类型推断负担
 */

// 共享类型
export type { SessionInfo, RefData, TabInfo } from './types';

// 会话管理
export { CreateSessionSchema, type CreateSessionInput } from './session.schema';
export { OpenUrlSchema, type OpenUrlInput } from './session.schema';

// 快照
export { SnapshotSchema, type SnapshotInput } from './snapshot.schema';
export {
  DeltaSnapshotSchema,
  type DeltaSnapshotInput,
} from './snapshot.schema';
export type {
  SnapshotResponse,
  DeltaSnapshotResponse,
} from './snapshot.schema';

// 动作
export {
  ActionTypeEnum,
  ActionSchema,
  type ActionType,
  type ActionInput,
} from './action.schema';
export type { ActionResponse } from './action.schema';

// 截图
export { ScreenshotSchema, type ScreenshotInput } from './screenshot.schema';
export type { ScreenshotResponse } from './screenshot.schema';

// 多窗口
export { CreateWindowSchema, type CreateWindowInput } from './window.schema';
export type { WindowInfo } from './window.schema';

// CDP 连接
export { ConnectCdpSchema, type ConnectCdpInput } from './cdp.schema';
export type { CdpSessionInfo } from './cdp.schema';

// 网络拦截
export { InterceptRuleSchema, SetInterceptRulesSchema } from './network.schema';
export type {
  InterceptRule,
  SetInterceptRulesInput,
  NetworkRequestRecord,
} from './network.schema';

// 会话持久化
export { ExportStorageSchema, ImportStorageSchema } from './storage.schema';
export type {
  ExportStorageInput,
  ImportStorageInput,
  StorageExportResult,
  CookieData,
} from './storage.schema';
