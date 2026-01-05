/**
 * Glob 模块入口 - React Native 版本
 *
 * 只导出 Mobile 实现，不导入 Node.js 实现（避免加载 fast-glob）
 */

// 接口和公共函数
export type { GlobImpl, GlobOptions, GlobEntry } from './glob-interface'
export { setGlobImpl, getGlobImpl, isGlobImplInitialized } from './glob-interface'

// Mobile 实现（使用 PlatformCapabilities）
export { createMobileGlobImpl, initMobileGlob } from './glob-mobile'

// 不导出 Node.js 实现，避免导入 fast-glob
// export { nodeGlobImpl, initNodeGlob } from './glob-node'
