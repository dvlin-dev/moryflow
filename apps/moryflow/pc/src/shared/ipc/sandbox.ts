/**
 * [DEFINES]: 沙盒相关 IPC 类型定义
 * [USED_BY]: preload, renderer, main/sandbox
 */

import type { AuthChoice, SandboxMode } from '@moryflow/agents-sandbox';

/** 沙盒授权请求 */
export interface SandboxAuthRequest {
  requestId: string;
  path: string;
}

/** 沙盒授权响应 */
export interface SandboxAuthResponse {
  requestId: string;
  choice: AuthChoice;
}

/** 沙盒设置 */
export interface SandboxSettings {
  mode: SandboxMode;
  authorizedPaths: string[];
}

/** 沙盒相关 API */
export interface SandboxApi {
  /** 获取沙盒设置 */
  getSettings: () => Promise<SandboxSettings>;
  /** 设置沙盒模式 */
  setMode: (mode: SandboxMode) => Promise<void>;
  /** 移除授权路径 */
  removeAuthorizedPath: (path: string) => Promise<void>;
  /** 清除所有授权路径 */
  clearAuthorizedPaths: () => Promise<void>;
  /** 响应授权请求 */
  respondAuth: (response: SandboxAuthResponse) => Promise<void>;
  /** 监听授权请求 */
  onAuthRequest: (handler: (request: SandboxAuthRequest) => void) => () => void;
}
