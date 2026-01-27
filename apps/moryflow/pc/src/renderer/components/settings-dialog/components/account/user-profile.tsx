import { useState } from 'react';
import { Button } from '@anyhunt/ui/components/button';
import { Avatar, AvatarFallback, AvatarImage } from '@anyhunt/ui/components/avatar';
import { Badge } from '@anyhunt/ui/components/badge';
import { Separator } from '@anyhunt/ui/components/separator';
import { Plus, ArrowUp, CreditCard, Crown, LogOut } from 'lucide-react';
import { useAuth, type UserInfo, TIER_DISPLAY_NAMES, TIER_COLORS } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';
import { SubscriptionDialog } from './subscription-dialog';
import { CreditPacksDialog } from './credit-packs-dialog';
import { DeleteAccountDialog } from './delete-account-dialog';

type UserProfileProps = {
  user: UserInfo;
};

/**
 * 用户信息展示组件
 * 显示用户头像、昵称、邮箱、会员等级、积分余额等
 */
export const UserProfile = ({ user }: UserProfileProps) => {
  const { t } = useTranslation('auth');
  const { logout, isLoading } = useAuth();
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [creditPacksOpen, setCreditPacksOpen] = useState(false);

  const tierDisplayName = TIER_DISPLAY_NAMES[user.subscriptionTier] || user.subscriptionTier;
  const tierColor = TIER_COLORS[user.subscriptionTier] || 'text-muted-foreground';

  // 获取用户名首字母作为头像备用
  const initials = (user.name || user.email)
    .split(/[@\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');

  // 是否可以升级（非 license 用户）
  const canUpgrade = user.subscriptionTier !== 'license' && user.subscriptionTier !== 'pro';

  return (
    <div className="space-y-6">
      {/* 用户基本信息 */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image} alt={user.name || user.email} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">{user.name || t('noNicknameSet')}</h3>
            <Badge variant="secondary" className={tierColor}>
              <Crown className="mr-1 h-3 w-3" />
              {tierDisplayName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.emailVerified ? (
            <p className="text-xs text-green-600">{t('emailVerified')}</p>
          ) : (
            <p className="text-xs text-amber-600">{t('emailNotVerified')}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('logout')}
        </Button>
      </div>

      <Separator />

      {/* 积分余额 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4" />
          {t('creditsBalance')}
        </h4>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{t('dailyCredits')}</p>
            <p className="text-xl font-semibold">{user.credits.daily}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{t('subscriptionCredits')}</p>
            <p className="text-xl font-semibold">{user.credits.subscription}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{t('purchasedCredits')}</p>
            <p className="text-xl font-semibold">{user.credits.purchased}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="text-xs text-primary">{t('total')}</p>
            <p className="text-xl font-semibold text-primary">{user.credits.total}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setCreditPacksOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('purchaseCredits')}
        </Button>
      </div>

      <Separator />

      {/* 会员权益 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Crown className="h-4 w-4" />
          {t('membershipBenefits')}
        </h4>
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`font-medium ${tierColor}`}>{tierDisplayName}</span>
            {canUpgrade && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubscriptionOpen(true)}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                {t('upgrade')}
              </Button>
            )}
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {user.tierInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator />

      {/* 危险区域 */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-destructive">
          {t('dangerZone')}
        </h4>
        <div className="rounded-lg border border-destructive/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('deleteAccount')}</p>
              <p className="text-sm text-muted-foreground">{t('deleteAccountWarning')}</p>
            </div>
            <DeleteAccountDialog user={user} onDeleted={() => logout()} />
          </div>
        </div>
      </div>

      {/* 订阅 Dialog */}
      <SubscriptionDialog
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
        currentTier={user.subscriptionTier}
      />

      {/* 积分包购买 Dialog */}
      <CreditPacksDialog open={creditPacksOpen} onOpenChange={setCreditPacksOpen} />
    </div>
  );
};
