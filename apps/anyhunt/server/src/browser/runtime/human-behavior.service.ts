/**
 * [INPUT]: 目标坐标 / 基础延迟值
 * [OUTPUT]: 鼠标轨迹点 / 抖动延迟值 / 导航延迟值
 * [POS]: 行为人性化计算+执行，与 ActionPacingService 互补（后者仅管 burst/cooldown）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';

interface Point {
  x: number;
  y: number;
}

@Injectable()
export class HumanBehaviorService {
  /**
   * 沿 Bezier 曲线移动鼠标到目标位置
   */
  async humanMouseMove(page: Page, toX: number, toY: number): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) return;

    // 随机起点（视口 30% 区域内）
    const fromX = randomBetween(0, viewport.width * 0.3);
    const fromY = randomBetween(0, viewport.height * 0.3);

    const points = this.computeMousePath(
      { x: fromX, y: fromY },
      { x: toX, y: toY },
    );

    for (const point of points) {
      await page.mouse.move(point.x, point.y);
    }
  }

  /**
   * 计算三次 Bezier 鼠标移动轨迹
   * 纯函数：返回路径点数组
   */
  computeMousePath(from: Point, to: Point): Point[] {
    const cp1: Point = {
      x: from.x + (to.x - from.x) * 0.25 + randomBetween(-100, 100),
      y: from.y + (to.y - from.y) * 0.25 + randomBetween(-100, 100),
    };
    const cp2: Point = {
      x: from.x + (to.x - from.x) * 0.75 + randomBetween(-100, 100),
      y: from.y + (to.y - from.y) * 0.75 + randomBetween(-100, 100),
    };

    const steps = 15 + Math.floor(Math.random() * 15);
    const points: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: cubicBezier(t, from.x, cp1.x, cp2.x, to.x),
        y: cubicBezier(t, from.y, cp1.y, cp2.y, to.y),
      });
    }

    return points;
  }

  /**
   * 计算打字抖动延迟（基础值 ±40%）
   * 纯函数
   */
  computeTypingDelay(baseDelay: number): number {
    const jitter = baseDelay * 0.4;
    return Math.max(10, baseDelay + randomBetween(-jitter, jitter));
  }

  /**
   * 计算导航前随机延迟（300~1000ms）
   * 纯函数
   */
  computeNavigationDelay(): number {
    return randomBetween(300, 1000);
  }
}

// ---------------------------------------------------------------------------
// 内部工具函数
// ---------------------------------------------------------------------------

/** 三次 Bezier 插值 */
function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const u = 1 - t;
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  );
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
