/**
 * [DEFINES]: SubscriptionAction
 * [USED_BY]: SidePanel, SubscriptionItem, SubscriptionContextMenu, MobileActionSheet
 * [POS]: 订阅条目可触发的“打开型动作”枚举（统一收敛 props）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type SubscriptionAction = 'settings' | 'history' | 'suggestions' | 'publish';
