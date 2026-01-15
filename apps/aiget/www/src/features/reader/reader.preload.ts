/**
 * [PROVIDES]: Reader 相关懒加载模块预取
 * [DEPENDS]: dynamic import()
 * [POS]: Hover/Click 预加载，降低首次打开的等待感（Notion 风格：不跳页、少打断）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

export function preloadTopicBrowseList() {
  void import('@/components/reader/TopicBrowseList');
}

export function preloadTopicPreviewDetail() {
  void import('@/components/reader/TopicPreviewDetail');
}

export function preloadCreateSubscriptionDialog() {
  void import('@/components/reader/CreateSubscriptionDialog');
}

export function preloadSubscriptionSettingsDialog() {
  void import('@/components/reader/SubscriptionSettingsDialog');
}

export function preloadPublishTopicDialog() {
  void import('@/components/reader/PublishTopicDialog');
}
