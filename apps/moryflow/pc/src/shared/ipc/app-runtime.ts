/**
 * [DEFINES]: app runtime IPC 类型（close behavior / launch-at-login / error contract）
 * [USED_BY]: main ipc-handlers, preload bridge, renderer settings
 * [POS]: app runtime 合同单一事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type AppCloseBehavior = 'hide_to_menubar' | 'quit';

export type LaunchAtLoginState = {
  enabled: boolean;
  supported: boolean;
  source: 'system';
};

export type AppRuntimeErrorCode = 'UNSUPPORTED_PLATFORM' | 'SYSTEM_API_ERROR';

export type AppRuntimeErrorPayload = {
  code: AppRuntimeErrorCode;
  message: string;
};

export type AppRuntimeResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: AppRuntimeErrorPayload;
    };
