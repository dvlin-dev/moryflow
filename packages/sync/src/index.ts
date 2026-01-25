/**
 * /sync
 *
 * [PROVIDES]: 云同步系统共享工具包
 * [DEPENDS]: 无外部依赖
 * [POS]: 供 PC 客户端、Mobile 客户端、服务端共用
 *
 * 包含：
 * - 向量时钟工具（vector-clock）
 */

// 向量时钟
export {
  type VectorClock,
  type ClockRelation,
  compareVectorClocks,
  mergeVectorClocks,
  incrementClock,
  createEmptyClock,
} from './vector-clock.js';
