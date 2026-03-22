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
  const { t: tw } = useTranslation('workspace');
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
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">
          {state.status === 'downloaded' || isRetryableError
            ? t('updateReadyToInstall')
            : t('newVersionAvailable')}
        </p>
        <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">{version}</p>
      </div>

      {state.downloadProgress ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {`${Math.round(state.downloadProgress.percent)}%`}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {state.status === 'downloaded' || isRetryableError ? (
          <Button
            type="button"
            size="sm"
            className="h-7 min-w-0 shrink overflow-hidden rounded-full px-3 text-xs"
            disabled={pendingAction !== null}
            onClick={() => {
              void handleAction('restart', async () => {
                await restartToInstall();
              });
            }}
          >
            <RotateCcw className="mr-1.5 size-3" />
            {tw('updateRestartAction')}
          </Button>
        ) : state.status === 'downloading' ? (
          <Button type="button" size="sm" className="h-7 min-w-0 shrink overflow-hidden rounded-full px-3 text-xs" disabled>
            <Download className="mr-1.5 size-3" />
            {t('updateDownloading')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-7 min-w-0 shrink overflow-hidden rounded-full px-3 text-xs"
            disabled={pendingAction !== null}
            onClick={() => {
              void handleAction('download', async () => {
                await downloadUpdate();
              });
            }}
          >
            <Download className="mr-1.5 size-3" />
            {tw('updateDownloadAction')}
          </Button>
        )}

        {state.status === 'available' || state.status === 'downloaded' || isRetryableError ? (
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={pendingAction !== null}
            onClick={() => {
              void handleAction('skip', async () => {
                await skipVersion(version);
              });
            }}
          >
            {tw('updateSkipAction')}
          </button>
        ) : null}
      </div>
    </div>
  );
};
