/**
 * [INPUT]: Electron 登录项系统 API（getLoginItemSettings / setLoginItemSettings）
 * [OUTPUT]: Launch at Login 状态读写（含结构化错误码）
 * [POS]: app runtime 登录项能力边界
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { app } from 'electron';

export type LaunchAtLoginState = {
  enabled: boolean;
  supported: boolean;
  source: 'system';
};

export type AppRuntimeErrorCode = 'UNSUPPORTED_PLATFORM' | 'SYSTEM_API_ERROR';

export class AppRuntimeError extends Error {
  code: AppRuntimeErrorCode;

  constructor(code: AppRuntimeErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppRuntimeError';
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

type LoginItemApi = Pick<Electron.App, 'getLoginItemSettings' | 'setLoginItemSettings'>;

type LaunchAtLoginDeps = {
  platform?: NodeJS.Platform;
  appApi?: LoginItemApi;
};

const resolveDeps = (deps?: LaunchAtLoginDeps): Required<LaunchAtLoginDeps> => {
  return {
    platform: deps?.platform ?? process.platform,
    appApi: deps?.appApi ?? app,
  };
};

const isSupportedPlatform = (platform: NodeJS.Platform): boolean => {
  return platform === 'darwin';
};

export const getLaunchAtLoginState = (deps?: LaunchAtLoginDeps): LaunchAtLoginState => {
  const resolved = resolveDeps(deps);
  if (!isSupportedPlatform(resolved.platform)) {
    return {
      enabled: false,
      supported: false,
      source: 'system',
    };
  }

  try {
    const settings = resolved.appApi.getLoginItemSettings();
    return {
      enabled: settings.openAtLogin === true,
      supported: true,
      source: 'system',
    };
  } catch (error) {
    throw new AppRuntimeError('SYSTEM_API_ERROR', 'Failed to read launch-at-login state.', error);
  }
};

export const setLaunchAtLoginEnabled = (
  enabled: boolean,
  deps?: LaunchAtLoginDeps
): LaunchAtLoginState => {
  const resolved = resolveDeps(deps);
  if (!isSupportedPlatform(resolved.platform)) {
    throw new AppRuntimeError(
      'UNSUPPORTED_PLATFORM',
      'Launch at Login is unsupported on current platform.'
    );
  }

  try {
    resolved.appApi.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
  } catch (error) {
    throw new AppRuntimeError('SYSTEM_API_ERROR', 'Failed to set launch-at-login state.', error);
  }

  return getLaunchAtLoginState(resolved);
};

export const wasOpenedAtLogin = (deps?: LaunchAtLoginDeps): boolean => {
  const resolved = resolveDeps(deps);
  if (!isSupportedPlatform(resolved.platform)) {
    return false;
  }
  try {
    return resolved.appApi.getLoginItemSettings().wasOpenedAtLogin === true;
  } catch {
    return false;
  }
};
