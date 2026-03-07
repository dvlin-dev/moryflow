/**
 * [PROPS]: TopBarActionsProps
 * [EMITS]: onOpenSettings()
 * [POS]: UnifiedTopBar 右侧动作区
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
