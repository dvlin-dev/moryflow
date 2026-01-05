import en from './en';

const zhCN = {
  // 会员卡片
  loginTitle: '登录 Moryflow',
  loginSubtitle: '解锁会员模型和更多功能',
  freeTier: '免费用户',
  remainingCredits: '剩余积分',
  upgrade: '升级',
  dailyCredits: '每日',
  subscriptionCredits: '订阅',
  purchasedCredits: '购买',

  // 升级弹窗
  upgradeTitle: '升级会员',
  loginRequired: '需要登录',
  requiresTier: '需要',
  orAbove: '及以上等级',
  requiresHigherTier: '需要更高等级会员',
  currentTier: '当前等级',
  notLoggedIn: '未登录',
  benefitsTitle: '升级后享有',
  benefit1: '解锁全部高级模型',
  benefit2: '更多每日积分配额',
  benefit3: '优先响应和技术支持',
  viewPlans: '查看升级方案',
  loginNow: '立即登录',
  later: '以后再说',
} as const satisfies Record<keyof typeof en, string>;

export default zhCN;
