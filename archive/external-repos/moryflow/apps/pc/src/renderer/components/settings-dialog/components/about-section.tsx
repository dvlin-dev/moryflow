import { useTranslation } from '@/lib/i18n'

type AboutSectionProps = {
  appVersion: string | null
}

export const AboutSection = ({ appVersion }: AboutSectionProps) => {
  const { t } = useTranslation('settings')

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl bg-background p-4">
        <h3 className="text-sm font-medium">{t('versionInfo')}</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('currentVersion')}</span>
            <span className="font-mono text-xs">{appVersion ?? t('unknown')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
