/**
 * [DEFINES]: Chromium 反检测启动参数
 * [USED_BY]: browser-pool.ts
 * [POS]: 在 chromium.launch({ args }) 时合并
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export const STEALTH_CHROMIUM_ARGS: string[] = [
  // 禁用自动化控制标识（navigator.webdriver 的底层源头之一）
  '--disable-blink-features=AutomationControlled',
  // 使用 ANGLE 渲染（避免 SwiftShader GPU 指纹）
  '--use-gl=angle',
  '--use-angle=default',
];
