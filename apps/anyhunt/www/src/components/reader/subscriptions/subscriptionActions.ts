/**
 * [DEFINES]: SubscriptionAction
 * [USED_BY]: SidePanel, SubscriptionItem, SubscriptionContextMenu, MobileActionSheet
 * [POS]: 订阅条目可触发的“打开型动作”枚举（统一收敛 props）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

export type SubscriptionAction = 'settings' | 'history' | 'suggestions' | 'publish';
