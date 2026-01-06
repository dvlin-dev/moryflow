/**
 * Glob 模块入口
 *
 * 导出 glob 抽象接口和平台实现
 */

// 接口和公共函数
export type { GlobImpl, GlobOptions, GlobEntry } from './glob-interface'
export { setGlobImpl, getGlobImpl, isGlobImplInitialized } from './glob-interface'

// Node.js 实现（包含 fast-glob 依赖）
export { nodeGlobImpl, initNodeGlob } from './glob-node'

// Mobile 实现（使用 PlatformCapabilities）
export { createMobileGlobImpl, initMobileGlob } from './glob-mobile'
