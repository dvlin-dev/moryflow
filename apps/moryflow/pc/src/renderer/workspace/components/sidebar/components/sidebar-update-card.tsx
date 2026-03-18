/**
 * [PROPS]: -
 * [EMITS]: manual update actions（download / skip / restart）
 * [POS]: Sidebar 左下角更新入口卡片
 */

import { useState } from 'react';
import { Button } from '@moryflow/ui/components/button';
import { Download, Loader2, RotateCcw } from 'lucide-react';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useTranslation } from '@/lib/i18n';

const isRenderableStatus = (status: string) =>
  status === 'available' ||
  status === 'downloading' ||
  status === 'downloaded' ||
  status === 'restarting';

export const SidebarUpdateCard = () => {
  const { t } = useTranslation('settings');
  const { isLoaded, state, downloadUpdate, skipVersion, restartToInstall } = useAppUpdate();
  const [pendingAction, setPendingAction] = useState<'download' | 'skip' | 'restart' | null>(null);

  if (!isLoaded || !state) {
    return null;
  }

  // Show the card for restart-failure errors when a downloaded version
  // is still available and no newer availableVersion conflicts with it.
  const isRetryableError =
    state.status === 'error' && state.downloadedVersion !== null && !state.availableVersion;

  if (!isRenderableStatus(state.status) && !isRetryableError) {
    return null;
  }

  const version = state.availableVersion ?? state.downloadedVersion;
  if (!version && state.status !== 'restarting') {
    return null;
  }

  const handleAction = async (
    action: 'download' | 'skip' | 'restart',
    runner: () => Promise<unknown>
  ) => {
    setPendingAction(action);
    try {
      await runner();
    } catch {
      // Errors are surfaced via main process state broadcast (toast/status).
    } finally {
      setPendingAction(null);
    }
  };

  if (state.status === 'restarting') {
    return (
      <div className="rounded-2xl border border-border/70 bg-background px-3 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <p className="text-sm font-medium">{t('restarting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {state.status === 'downloaded' || isRetryableError
              ? t('updateReadyToInstall')
              : t('newVersionAvailable')}
          </p>
          <p className="text-xs text-muted-foreground">{version}</p>
        </div>
      </div>

      {state.downloadProgress ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {`${Math.round(state.downloadProgress.percent)}%`}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        {state.status === 'downloaded' || isRetryableError ? (
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 rounded-full"
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
        ) : state.status === 'downloading' ? (
          <Button type="button" size="sm" className="h-8 flex-1 rounded-full" disabled>
            <Download className="mr-1.5 size-3.5" />
            {t('updateDownloading')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 rounded-full"
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
        )}

        {state.status === 'available' || state.status === 'downloaded' || isRetryableError ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-3"
            disabled={pendingAction !== null}
            onClick={() => {
              void handleAction('skip', async () => {
                await skipVersion(version);
              });
            }}
          >
            {t('skipThisVersion')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
