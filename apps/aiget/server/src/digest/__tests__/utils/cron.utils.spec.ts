/**
 * Cron Utils Tests
 *
 * [PROVIDES]: Cron 工具函数测试
 * [POS]: 测试 cron 表达式解析和时间计算
 */

import { describe, it, expect } from 'vitest';
import {
  getNextRunTime,
  getMinIntervalMinutes,
  isValidCronExpression,
  validateCronInterval,
  describeCron,
  getNextNRunTimes,
  CRON_PRESETS,
} from '../../utils/cron.utils';

describe('Cron Utils', () => {
  // ========== getNextRunTime ==========

  describe('getNextRunTime', () => {
    it('should calculate next run time with timezone', () => {
      const baseDate = new Date('2024-01-15T08:00:00Z');
      const result = getNextRunTime('0 9 * * *', 'Asia/Shanghai', baseDate);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(baseDate.getTime());
    });

    it('should respect timezone offset', () => {
      const baseDate = new Date('2024-01-15T00:00:00Z');

      // 同一个 cron，不同时区应该得到不同的 UTC 时间
      const resultShanghai = getNextRunTime(
        '0 9 * * *',
        'Asia/Shanghai',
        baseDate,
      );
      const resultNewYork = getNextRunTime(
        '0 9 * * *',
        'America/New_York',
        baseDate,
      );

      expect(resultShanghai.getTime()).not.toBe(resultNewYork.getTime());
    });

    it('should throw error for invalid cron expression', () => {
      expect(() => {
        getNextRunTime('invalid cron', 'UTC');
      }).toThrow();
    });

    it('should use current date when fromDate not provided', () => {
      const before = Date.now();
      const result = getNextRunTime('0 * * * *', 'UTC');
      const after = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      // 下次执行时间应该在 1 小时内
      expect(result.getTime() - after).toBeLessThanOrEqual(3600000);
    });
  });

  // ========== getMinIntervalMinutes ==========

  describe('getMinIntervalMinutes', () => {
    it.each([
      ['0 * * * *', 60], // 每小时
      ['*/30 * * * *', 30], // 每 30 分钟
      ['0 0 * * *', 1440], // 每天
      ['0 */6 * * *', 360], // 每 6 小时
      ['0 */12 * * *', 720], // 每 12 小时
    ])('getMinIntervalMinutes(%s) should return %d', (cron, expected) => {
      expect(getMinIntervalMinutes(cron)).toBe(expected);
    });

    it('should return 60 for invalid cron expression', () => {
      expect(getMinIntervalMinutes('invalid')).toBe(60);
    });

    it('should handle complex expressions', () => {
      // 每周一早上 8 点
      const interval = getMinIntervalMinutes('0 8 * * 1');
      expect(interval).toBe(10080); // 7 * 24 * 60 = 10080
    });
  });

  // ========== isValidCronExpression ==========

  describe('isValidCronExpression', () => {
    it('should return true for valid expressions', () => {
      expect(isValidCronExpression('0 * * * *')).toBe(true);
      expect(isValidCronExpression('*/15 * * * *')).toBe(true);
      expect(isValidCronExpression('0 9 * * 1-5')).toBe(true);
      expect(isValidCronExpression('0 0 1 * *')).toBe(true);
    });

    it('should return false for invalid expressions', () => {
      expect(isValidCronExpression('invalid')).toBe(false);
      expect(isValidCronExpression('0 0 0 0 0 0')).toBe(false); // 6 fields
      expect(isValidCronExpression('60 * * * *')).toBe(false); // invalid minute
      expect(isValidCronExpression('* 25 * * *')).toBe(false); // invalid hour
    });

    it('should handle empty string as valid (cron-parser behavior)', () => {
      // Note: cron-parser treats empty string as valid, using defaults
      expect(isValidCronExpression('')).toBe(true);
    });
  });

  // ========== validateCronInterval ==========

  describe('validateCronInterval', () => {
    it('should validate when interval meets minimum requirement', () => {
      const result = validateCronInterval('0 * * * *', 60);

      expect(result.valid).toBe(true);
      expect(result.actualInterval).toBe(60);
    });

    it('should invalidate when interval below minimum', () => {
      const result = validateCronInterval('*/30 * * * *', 60);

      expect(result.valid).toBe(false);
      expect(result.actualInterval).toBe(30);
    });

    it('should validate when interval exceeds minimum', () => {
      const result = validateCronInterval('0 0 * * *', 60);

      expect(result.valid).toBe(true);
      expect(result.actualInterval).toBe(1440);
    });

    it('should handle exact boundary', () => {
      const result = validateCronInterval('*/10 * * * *', 10);

      expect(result.valid).toBe(true);
      expect(result.actualInterval).toBe(10);
    });
  });

  // ========== describeCron ==========

  describe('describeCron', () => {
    it('should describe hourly cron', () => {
      expect(describeCron('0 * * * *')).toBe('Every hour');
      expect(describeCron('30 * * * *')).toBe('Every hour at minute 30');
    });

    it('should describe daily cron', () => {
      expect(describeCron('0 9 * * *')).toBe('Daily at 9:00');
      expect(describeCron('30 20 * * *')).toBe('Daily at 20:30');
    });

    it('should describe interval cron', () => {
      expect(describeCron('0 */6 * * *')).toBe('Every 6 hours');
      expect(describeCron('0 */12 * * *')).toBe('Every 12 hours');
    });

    it('should describe weekdays cron', () => {
      expect(describeCron('0 9 * * 1-5')).toBe('Weekdays at 9:00');
    });

    it('should describe weekly cron', () => {
      expect(describeCron('0 8 * * 1')).toBe('Every Mon at 8:00');
      expect(describeCron('0 9 * * 0')).toBe('Every Sun at 9:00');
      expect(describeCron('0 10 * * 5')).toBe('Every Fri at 10:00');
    });

    it('should return original expression for complex patterns', () => {
      expect(describeCron('0 9 1 * *')).toBe('0 9 1 * *'); // 每月 1 号
      expect(describeCron('0 9 * 1 *')).toBe('0 9 * 1 *'); // 每年 1 月
    });

    it('should return original for invalid expressions', () => {
      expect(describeCron('invalid')).toBe('invalid');
      expect(describeCron('')).toBe('');
    });
  });

  // ========== getNextNRunTimes ==========

  describe('getNextNRunTimes', () => {
    it('should return correct number of times', () => {
      const result = getNextNRunTimes('0 * * * *', 'UTC', 5);

      expect(result).toHaveLength(5);
    });

    it('should return times in ascending order', () => {
      const result = getNextNRunTimes('0 * * * *', 'UTC', 3);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].getTime()).toBeGreaterThan(result[i - 1].getTime());
      }
    });

    it('should respect timezone', () => {
      const baseDate = new Date('2024-01-15T00:00:00Z');
      const resultShanghai = getNextNRunTimes(
        '0 9 * * *',
        'Asia/Shanghai',
        3,
        baseDate,
      );
      const resultNewYork = getNextNRunTimes(
        '0 9 * * *',
        'America/New_York',
        3,
        baseDate,
      );

      // 同一个 cron 在不同时区应该有不同的 UTC 时间
      expect(resultShanghai[0].getTime()).not.toBe(resultNewYork[0].getTime());
    });

    it('should default to 5 results', () => {
      const result = getNextNRunTimes('0 * * * *', 'UTC');

      expect(result).toHaveLength(5);
    });

    it('should use current date when fromDate not provided', () => {
      const before = Date.now();
      const result = getNextNRunTimes('0 * * * *', 'UTC', 1);

      expect(result[0].getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  // ========== CRON_PRESETS ==========

  describe('CRON_PRESETS', () => {
    it('should have valid hourly preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.hourly)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.hourly)).toBe(60);
    });

    it('should have valid every6Hours preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.every6Hours)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.every6Hours)).toBe(360);
    });

    it('should have valid every12Hours preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.every12Hours)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.every12Hours)).toBe(720);
    });

    it('should have valid dailyMorning preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.dailyMorning)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.dailyMorning)).toBe(1440);
    });

    it('should have valid dailyEvening preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.dailyEvening)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.dailyEvening)).toBe(1440);
    });

    it('should have valid weeklyMonday preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.weeklyMonday)).toBe(true);
      expect(getMinIntervalMinutes(CRON_PRESETS.weeklyMonday)).toBe(10080);
    });

    it('should have valid weekdays preset', () => {
      expect(isValidCronExpression(CRON_PRESETS.weekdays)).toBe(true);
    });

    it('should have all presets describe correctly', () => {
      expect(describeCron(CRON_PRESETS.hourly)).toBe('Every hour');
      expect(describeCron(CRON_PRESETS.every6Hours)).toBe('Every 6 hours');
      expect(describeCron(CRON_PRESETS.dailyMorning)).toBe('Daily at 8:00');
      expect(describeCron(CRON_PRESETS.weekdays)).toBe('Weekdays at 8:00');
    });
  });
});
