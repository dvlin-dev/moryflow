/**
 * [PROPS]: AccountEntryButtonProps
 * [EMITS]: onOpenSettings()
 * [POS]: UnifiedTopBar 右上角账号入口（设置按钮左侧）
 * [UPDATE]: 2026-03-03 - 新增登录入口/用户名胶囊，点击直达 Account 设置
 */

import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/server';

type AccountEntryButtonProps = {
  onOpenSettings: () => void;
};

const resolveAccountLabel = (
  input: { name?: string; email?: string } | null,
  fallbackLabel: string
): string => {
  if (!input) {
    return fallbackLabel;
  }

  const name = input.name?.trim();
  if (name) {
    return name;
  }

  const email = input.email?.trim();
  if (!email) {
    return fallbackLabel;
  }

  const [localPart] = email.split('@');
  if (localPart?.trim()) {
    return localPart.trim();
  }

  return email;
};

export const AccountEntryButton = ({ onOpenSettings }: AccountEntryButtonProps) => {
  const { t } = useTranslation('workspace');
  const { user, isAuthenticated } = useAuth();

  const label = resolveAccountLabel(
    isAuthenticated ? { name: user?.name, email: user?.email } : null,
    t('topbarAccountAction')
  );

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      data-testid="topbar-account-entry-button"
      aria-label={t('topbarAccountSettingsLabel')}
      title={label}
      className="max-w-[180px] rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
    >
      <span className="block truncate">{label}</span>
    </button>
  );
};
