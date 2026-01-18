/**
 * [PROVIDES]: Daily credits（按 UTC 天）工具函数
 * [DEPENDS]: Date
 * [POS]: quota 模块的 daily credits 计算基础（key/date/重置时间）
 */

/** 获取 UTC 日期字符串（YYYY-MM-DD） */
export function getUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 获取下一次 UTC 午夜时间（Date） */
export function getNextUtcMidnight(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}
