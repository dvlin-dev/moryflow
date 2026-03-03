/**
 * [PROPS]: TopBarActionsProps
 * [EMITS]: onOpenSettings()
 * [POS]: UnifiedTopBar 右侧动作区
 * [UPDATE]: 2026-03-03 - 新增账号入口（未登录显示 Log in，已登录显示用户名）
 */

import { AccountEntryButton } from './account-entry-button';
import { OpenSettingsButton } from './open-settings-button';

type TopBarActionsProps = {
  onOpenSettings: () => void;
};

export const TopBarActions = ({ onOpenSettings }: TopBarActionsProps) => {
  return (
    <div className="window-no-drag flex items-center justify-end gap-1">
      <AccountEntryButton onOpenSettings={onOpenSettings} />
      <OpenSettingsButton onOpenSettings={onOpenSettings} />
    </div>
  );
};
