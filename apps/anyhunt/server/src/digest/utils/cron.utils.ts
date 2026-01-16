/**
 * Cron Utilities
 *
 * [PROVIDES]: Cron 表达式解析和时间计算
 * [POS]: 订阅调度的时间计算工具
 */

import { parseExpression } from 'cron-parser';

/**
 * 计算下次运行时间
 */
export function getNextRunTime(
  cronExpression: string,
  timezone: string,
  fromDate?: Date,
): Date {
  const interval = parseExpression(cronExpression, {
    currentDate: fromDate || new Date(),
    tz: timezone,
  });

  return interval.next().toDate();
}

/**
 * 计算 Cron 表达式的最小间隔（分钟）
 */
export function getMinIntervalMinutes(cronExpression: string): number {
  try {
    const interval = parseExpression(cronExpression, {
      currentDate: new Date(),
    });

    // 获取接下来的 5 次执行时间
    const times: Date[] = [];
    for (let i = 0; i < 5; i++) {
      times.push(interval.next().toDate());
    }

    // 计算最小间隔
    let minInterval = Infinity;
    for (let i = 1; i < times.length; i++) {
      const interval = (times[i].getTime() - times[i - 1].getTime()) / 60000;
      if (interval < minInterval) {
        minInterval = interval;
      }
    }

    return minInterval === Infinity ? 60 : minInterval;
  } catch {
    return 60; // 默认 1 小时
  }
}

/**
 * 验证 Cron 表达式是否有效
 */
export function isValidCronExpression(cronExpression: string): boolean {
  try {
    parseExpression(cronExpression);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 Cron 表达式间隔是否满足最小要求
 */
export function validateCronInterval(
  cronExpression: string,
  minIntervalMinutes: number,
): { valid: boolean; actualInterval: number } {
  const actualInterval = getMinIntervalMinutes(cronExpression);
  return {
    valid: actualInterval >= minIntervalMinutes,
    actualInterval,
  };
}

/**
 * 常用 Cron 表达式预设
 */
export const CRON_PRESETS = {
  /** 每小时 */
  hourly: '0 * * * *',
  /** 每 6 小时 */
  every6Hours: '0 */6 * * *',
  /** 每 12 小时 */
  every12Hours: '0 */12 * * *',
  /** 每天早上 8 点 */
  dailyMorning: '0 8 * * *',
  /** 每天晚上 8 点 */
  dailyEvening: '0 20 * * *',
  /** 每周一早上 8 点 */
  weeklyMonday: '0 8 * * 1',
  /** 工作日早上 8 点 */
  weekdays: '0 8 * * 1-5',
} as const;

/**
 * 将 Cron 表达式转换为人类可读的描述
 */
export function describeCron(cronExpression: string): string {
  try {
    // 简单解析常见模式
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return cronExpression;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 每小时
    if (
      hour === '*' &&
      dayOfMonth === '*' &&
      month === '*' &&
      dayOfWeek === '*'
    ) {
      if (minute === '0') return 'Every hour';
      return `Every hour at minute ${minute}`;
    }

    // 每天
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1];
        return `Every ${interval} hours`;
      }
      return `Daily at ${hour}:${minute.padStart(2, '0')}`;
    }

    // 工作日
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
      return `Weekdays at ${hour}:${minute.padStart(2, '0')}`;
    }

    // 每周
    if (dayOfMonth === '*' && month === '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayIndex = parseInt(dayOfWeek, 10);
      if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
        return `Every ${days[dayIndex]} at ${hour}:${minute.padStart(2, '0')}`;
      }
    }

    return cronExpression;
  } catch {
    return cronExpression;
  }
}

/**
 * 获取最近 N 次执行时间
 */
export function getNextNRunTimes(
  cronExpression: string,
  timezone: string,
  count: number = 5,
  fromDate?: Date,
): Date[] {
  const interval = parseExpression(cronExpression, {
    currentDate: fromDate || new Date(),
    tz: timezone,
  });

  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    times.push(interval.next().toDate());
  }

  return times;
}
