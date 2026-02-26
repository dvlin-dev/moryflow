import { useTranslation } from '@/lib/i18n';

export const LoginPanelTerms = () => {
  const { t } = useTranslation('auth');

  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      {t('agreeToTerms')}{' '}
      <a href="#" className="hover:underline">
        {t('termsOfService')}
      </a>{' '}
      {t('and')}{' '}
      <a href="#" className="hover:underline">
        {t('privacyPolicyLink')}
      </a>
    </p>
  );
};
