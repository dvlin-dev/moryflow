import { describe, it, expect } from 'vitest';
import { HumanBehaviorService } from '../runtime/human-behavior.service';

describe('HumanBehaviorService', () => {
  const service = new HumanBehaviorService();

  describe('computeMousePath', () => {
    it('生成合理数量的轨迹点', () => {
      const points = service.computeMousePath(
        { x: 0, y: 0 },
        { x: 500, y: 300 },
      );
      // 15~30 步 + 起点
      expect(points.length).toBeGreaterThanOrEqual(16);
      expect(points.length).toBeLessThanOrEqual(31);
    });

    it('轨迹起点接近 from', () => {
      const from = { x: 100, y: 100 };
      const to = { x: 500, y: 300 };
      const points = service.computeMousePath(from, to);

      expect(points[0].x).toBeCloseTo(from.x, 0);
      expect(points[0].y).toBeCloseTo(from.y, 0);
    });

    it('轨迹终点等于 to', () => {
      const from = { x: 100, y: 100 };
      const to = { x: 500, y: 300 };
      const points = service.computeMousePath(from, to);

      const last = points[points.length - 1];
      expect(last.x).toBeCloseTo(to.x, 0);
      expect(last.y).toBeCloseTo(to.y, 0);
    });

    it('每次调用生成不同的路径（随机性）', () => {
      const path1 = service.computeMousePath(
        { x: 0, y: 0 },
        { x: 500, y: 300 },
      );
      const path2 = service.computeMousePath(
        { x: 0, y: 0 },
        { x: 500, y: 300 },
      );

      // 中间点应该不同（概率极高）
      const mid1 = path1[Math.floor(path1.length / 2)];
      const mid2 = path2[Math.floor(path2.length / 2)];
      const isSame = mid1.x === mid2.x && mid1.y === mid2.y;
      // 极小概率相同，实际不应发生
      expect(isSame).toBe(false);
    });
  });

  describe('computeTypingDelay', () => {
    it('基础 50ms 延迟在 ±40% 范围内', () => {
      for (let i = 0; i < 100; i++) {
        const delay = service.computeTypingDelay(50);
        expect(delay).toBeGreaterThanOrEqual(10); // 最小值保护
        expect(delay).toBeLessThanOrEqual(70); // 50 + 50*0.4 = 70
      }
    });

    it('基础 100ms 延迟在合理范围', () => {
      for (let i = 0; i < 100; i++) {
        const delay = service.computeTypingDelay(100);
        expect(delay).toBeGreaterThanOrEqual(60); // 100 - 40
        expect(delay).toBeLessThanOrEqual(140); // 100 + 40
      }
    });

    it('不返回负数', () => {
      for (let i = 0; i < 100; i++) {
        const delay = service.computeTypingDelay(10);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('computeNavigationDelay', () => {
    it('在 300~1000ms 范围内', () => {
      for (let i = 0; i < 100; i++) {
        const delay = service.computeNavigationDelay();
        expect(delay).toBeGreaterThanOrEqual(300);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });
  });
});
