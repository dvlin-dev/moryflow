import { useTranslation } from '@/lib/i18n';
import type { AuthMode } from './login-panel.types';

type LoginPanelModeHeaderProps = {
  mode: AuthMode;
};

export const LoginPanelModeHeader = ({ mode }: LoginPanelModeHeaderProps) => {
  const { t } = useTranslation('auth');

  return (
    <div className="mb-6 text-center">
      <h3 className="text-lg font-medium">
        {mode === 'login' ? t('welcomeBackTitle') : t('createAccountTitle')}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === 'login' ? t('signInToCloudService') : t('signUpToMoryflow')}
      </p>
    </div>
  );
};
