/**
 * [DEFINES]: user credits 组件状态类型
 * [USED_BY]: UserCreditsSheet / 子组件
 * [POS]: user credits 子组件共享类型
 */

export type UserSummaryState = 'loading' | 'error' | 'not_found' | 'ready';
export type CreditGrantsState = 'loading' | 'error' | 'empty' | 'ready';
