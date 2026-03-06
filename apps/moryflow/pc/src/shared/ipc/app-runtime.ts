/**
 * [DEFINES]: app runtime IPC 类型（close behavior / launch-at-login / error contract）
 * [USED_BY]: main ipc-handlers, preload bridge, renderer settings
 * [POS]: app runtime 合同单一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
