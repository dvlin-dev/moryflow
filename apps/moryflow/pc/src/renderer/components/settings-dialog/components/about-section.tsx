import { useState } from 'react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { Download, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useTranslation } from '@/lib/i18n';

type AboutSectionProps = {
  appVersion: string | null;
};

export const AboutSection = ({ appVersion }: AboutSectionProps) => {
  const { t } = useTranslation('settings');
  const {
    state,
    settings,
    checkForUpdates,
    downloadUpdate,
    restartToInstall,
    openReleaseNotes,
    openDownloadPage,
  } = useAppUpdate();
  const [pendingAction, setPendingAction] = useState<
    'check' | 'download' | 'restart' | 'notes' | 'browser' | null
  >(null);

  const stateErrorMessage = state?.errorMessage?.trim() || null;
  const isMandatoryUpdate = Boolean(state?.requiresImmediateUpdate || state?.currentVersionBlocked);
  const isDownloading = state?.status === 'downloading';
  const lastCheckedAt = state?.lastCheckedAt ?? settings?.lastCheckAt ?? null;
  const statusText =
    state?.status === 'error'
      ? stateErrorMessage ?? 'Update failed'
      : isMandatoryUpdate
        ? 'Update required'
        : state?.status === 'available'
          ? t('newVersionAvailable')
          : state?.status === 'downloaded'
            ? t('updateReadyToInstall')
            : isDownloading
              ? t('updateDownloading')
              : t('upToDate');

  const handleAction = async (
    action: 'check' | 'download' | 'restart' | 'notes' | 'browser',
    runner: () => Promise<unknown>
  ) => {
    setPendingAction(action);
    try {
      await runner();
    } catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message : 'Update operation failed.';
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

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

      <div className="space-y-3 rounded-xl bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">{t('appUpdates')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{statusText}</p>
          </div>
          {settings?.channel === 'beta' ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] uppercase">
              beta
            </Badge>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('latestVersion')}</span>
            <span className="font-mono text-xs">
              {state?.availableVersion ?? state?.downloadedVersion ?? state?.latestVersion ?? t('upToDate')}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">{t('lastCheckedAt')}</span>
            <span className="text-xs">
              {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString() : t('neverChecked')}
            </span>
          </div>
        </div>

        {isDownloading && state?.downloadProgress ? (
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {`${Math.round(state.downloadProgress.percent)}%`}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() => {
              void handleAction('check', async () => {
                await checkForUpdates();
              });
            }}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            {t('checkForUpdates')}
          </Button>

          {state?.status === 'downloaded' ? (
            <Button
              type="button"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => {
                void handleAction('restart', async () => {
                  await restartToInstall();
                });
              }}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              {t('restartToInstall')}
            </Button>
          ) : state?.availableVersion && !isDownloading ? (
            <Button
              type="button"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => {
                void handleAction('download', async () => {
                  await downloadUpdate();
                });
              }}
            >
              <Download className="mr-1.5 size-3.5" />
              {t('downloadUpdate')}
            </Button>
          ) : null}

          {state?.releaseNotesUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pendingAction !== null}
              onClick={() => {
                void handleAction('notes', async () => {
                  await openReleaseNotes();
                });
              }}
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              {t('releaseNotes')}
            </Button>
          ) : null}

          {state?.downloadUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pendingAction !== null}
              onClick={() => {
                void handleAction('browser', async () => {
                  await openDownloadPage();
                });
              }}
            >
              <ExternalLink className="mr-1.5 size-3.5" />
              {t('downloadFromBrowser')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
