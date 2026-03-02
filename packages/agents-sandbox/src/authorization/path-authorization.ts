/**
 * [PROVIDES]: 外部路径授权管理
 * [DEPENDS]: 持久化存储
 * [POS]: 管理用户授权的外部路径（永久）
 */

import type { Storage, AuthChoice } from '../types';
import { isPathEqualOrWithin, normalizeAuthorizedPath } from '../path-utils';

/** 存储 key */
const STORAGE_KEY = 'sandbox:authorizedPaths';

export class PathAuthorization {
  /** 永久授权（保存到配置） */
  private persistentPaths: Set<string>;

  constructor(private storage: Storage) {
    const saved = storage.get<string[]>(STORAGE_KEY);
    this.persistentPaths = new Set((saved ?? []).map((path) => normalizeAuthorizedPath(path)));
  }

  /**
   * 检查路径是否已永久授权
   */
  isAuthorized(path: string): boolean {
    const normalized = normalizeAuthorizedPath(path);
    // 检查精确匹配
    if (this.persistentPaths.has(normalized)) return true;

    // 检查父目录授权
    for (const authorized of this.persistentPaths) {
      if (isPathEqualOrWithin(normalized, authorized)) return true;
    }

    return false;
  }

  /**
   * 处理用户授权选择
   * @returns 是否允许访问
   */
  handleChoice(path: string, choice: AuthChoice): boolean {
    const normalized = normalizeAuthorizedPath(path);
    switch (choice) {
      case 'deny':
        return false;

      case 'allow_always':
        this.persistentPaths.add(normalized);
        this.savePersistent();
        return true;

      default:
        return false;
    }
  }

  /**
   * 获取所有永久授权的路径（用于设置页面展示）
   */
  getPersistentPaths(): string[] {
    return [...this.persistentPaths];
  }

  /**
   * 添加永久授权路径（用于设置页手动管理）
   */
  addPersistent(path: string): void {
    this.persistentPaths.add(normalizeAuthorizedPath(path));
    this.savePersistent();
  }

  /**
   * 移除永久授权（用于设置页面管理）
   */
  removePersistent(path: string): void {
    this.persistentPaths.delete(normalizeAuthorizedPath(path));
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
}
