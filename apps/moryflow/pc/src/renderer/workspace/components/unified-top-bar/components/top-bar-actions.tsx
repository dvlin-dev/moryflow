/**
 * [PROPS]: TopBarActionsProps
 * [EMITS]: onOpenSettings()
 * [POS]: UnifiedTopBar 右侧动作区
 */

import { OpenSettingsButton } from './open-settings-button';

type TopBarActionsProps = {
  onOpenSettings: () => void;
};

export const TopBarActions = ({ onOpenSettings }: TopBarActionsProps) => {
  return (
    <div className="window-no-drag flex items-center justify-end">
      <OpenSettingsButton onOpenSettings={onOpenSettings} />
    </div>
  );
};
