import { useTranslation } from '@/lib/i18n';

const DISCORD_URL = 'https://discord.gg/cyBRZa9zJr';

export const BetaNotice = () => {
  const { t } = useTranslation('settings');

  const handleDiscordClick = () => {
    window.desktopAPI.membership.openExternal(DISCORD_URL);
  };

  return (
    <p className="text-xs text-muted-foreground">
      {t('betaNoticePrefix')}
      <button
        type="button"
        className="text-primary cursor-pointer hover:underline"
        onClick={handleDiscordClick}
      >
        {t('betaNoticeLinkText')}
      </button>
      {t('betaNoticeSuffix')}
    </p>
  );
};
