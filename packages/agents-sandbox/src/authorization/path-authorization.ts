/**
 * [PROVIDES]: 外部路径授权管理
 * [DEPENDS]: 持久化存储
 * [POS]: 管理用户授权的外部路径（临时 + 永久）
 */

import { normalize, resolve, sep } from 'path';
import type { Storage, AuthChoice } from '../types';

/** 存储 key */
const STORAGE_KEY = 'sandbox:authorizedPaths';

export class PathAuthorization {
  /** 永久授权（保存到配置） */
  private persistentPaths: Set<string>;
  /** 临时授权（仅本次命令） */
  private tempPaths: Set<string> = new Set();

  constructor(private storage: Storage) {
    const saved = storage.get<string[]>(STORAGE_KEY);
    this.persistentPaths = new Set((saved ?? []).map((path) => this.normalizePath(path)));
  }

  /**
   * 检查路径是否已永久授权
   */
  isAuthorized(path: string): boolean {
    const normalized = this.normalizePath(path);
    // 检查临时授权
    if (this.tempPaths.has(normalized)) return true;

    // 检查精确匹配
    if (this.persistentPaths.has(normalized)) return true;

    // 检查父目录授权
    for (const authorized of this.persistentPaths) {
      const prefix = authorized.endsWith(sep) ? authorized : `${authorized}${sep}`;
      if (normalized.startsWith(prefix)) return true;
    }

    return false;
  }

  /**
   * 处理用户授权选择
   * @returns 是否允许访问
   */
  handleChoice(path: string, choice: AuthChoice): boolean {
    const normalized = this.normalizePath(path);
    switch (choice) {
      case 'deny':
        return false;

      case 'allow_once':
        this.tempPaths.add(normalized);
        return true;

      case 'allow_always':
        this.persistentPaths.add(normalized);
        this.savePersistent();
        return true;
    }
  }

  /**
   * 清除临时授权（命令执行后调用）
   */
  clearTemp(): void {
    this.tempPaths.clear();
  }

  /**
   * 获取所有永久授权的路径（用于设置页面展示）
   */
  getPersistentPaths(): string[] {
    return [...this.persistentPaths];
  }

  /**
   * 移除永久授权（用于设置页面管理）
   */
  removePersistent(path: string): void {
    this.persistentPaths.delete(this.normalizePath(path));
    this.savePersistent();
  }

  /**
   * 清除所有永久授权
   */
  clearAllPersistent(): void {
    this.persistentPaths.clear();
    this.savePersistent();
  }

  /**
   * 保存永久授权到存储
   */
  private savePersistent(): void {
    this.storage.set(STORAGE_KEY, [...this.persistentPaths]);
  }

  private normalizePath(path: string): string {
    const normalized = normalize(resolve(path));
    const trimmed =
      normalized.length > 1 && normalized.endsWith(sep) ? normalized.slice(0, -1) : normalized;
    return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
  }
}
