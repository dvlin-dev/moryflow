/**
 * [PROVIDES]: VectorClock 类型和工具函数
 * [DEPENDS]: 无外部依赖
 * [POS]: 云同步系统核心模块，用于追踪文件因果关系
 */

/**
 * 向量时钟：记录每个设备对文件的修改次数
 * 例如：{ "mac-abc": 3, "iphone-xyz": 2 }
 * 表示 Mac 修改了 3 次，iPhone 修改了 2 次
 */
export type VectorClock = Record<string, number>

/**
 * 两个向量时钟的因果关系
 */
export type ClockRelation = 'equal' | 'before' | 'after' | 'concurrent'

/**
 * 比较两个向量时钟的因果关系
 *
 * @param a - 本地时钟
 * @param b - 远端时钟
 * @returns 因果关系：
 *   - 'equal': 完全相同，无需操作
 *   - 'before': a 发生在 b 之前（本地落后），需要下载
 *   - 'after': a 发生在 b 之后（本地领先），需要上传
 *   - 'concurrent': 并发修改，需要冲突处理
 */
export function compareVectorClocks(a: VectorClock, b: VectorClock): ClockRelation {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

  let aBeforeB = false
  let bBeforeA = false

  for (const key of allKeys) {
    const va = a[key] ?? 0
    const vb = b[key] ?? 0

    if (va < vb) aBeforeB = true
    if (va > vb) bBeforeA = true
  }

  if (!aBeforeB && !bBeforeA) return 'equal'
  if (aBeforeB && !bBeforeA) return 'before'
  if (!aBeforeB && bBeforeA) return 'after'
  return 'concurrent'
}

/**
 * 合并两个向量时钟（取每个分量的最大值）
 * 用于冲突解决后建立新的时钟基线
 */
export function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a }
  for (const [key, value] of Object.entries(b)) {
    result[key] = Math.max(result[key] ?? 0, value)
  }
  return result
}

/**
 * 递增指定设备的时钟分量
 * 每次本地修改文件时调用
 */
export function incrementClock(clock: VectorClock, deviceId: string): VectorClock {
  return {
    ...clock,
    [deviceId]: (clock[deviceId] ?? 0) + 1,
  }
}

/**
 * 创建空的向量时钟
 */
export function createEmptyClock(): VectorClock {
  return {}
}

/**
 * 检查向量时钟是否为空（未初始化）
 */
export function isEmptyClock(clock: VectorClock): boolean {
  return Object.keys(clock).length === 0
}

/**
 * 克隆向量时钟（浅拷贝）
 */
export function cloneClock(clock: VectorClock): VectorClock {
  return { ...clock }
}
