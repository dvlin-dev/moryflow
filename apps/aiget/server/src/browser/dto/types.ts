/**
 * Browser DTO Types - 共享类型定义
 *
 * [DEFINES]: SessionInfo, RefData, TabInfo
 * [USED_BY]: 所有 browser dto 模块
 * [POS]: 跨模块共享的基础类型
 */

/** 会话信息 */
export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  url: string | null;
  title: string | null;
}

/** Ref 元素信息 */
export interface RefData {
  /** ARIA 角色 */
  role: string;
  /** 元素名称/文本 */
  name?: string;
  /** 重复元素索引（仅当存在多个相同 role+name 时） */
  nth?: number;
}

/** 标签页信息 */
export interface TabInfo {
  /** 标签页索引 */
  index: number;
  /** 当前 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 是否为活跃标签 */
  active: boolean;
}
