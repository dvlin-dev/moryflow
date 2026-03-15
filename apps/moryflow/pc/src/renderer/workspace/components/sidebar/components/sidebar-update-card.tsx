/**
 * [PROPS]: -
 * [EMITS]: manual update actions（download / skip / restart）
 * [POS]: Sidebar 左下角更新入口卡片
 */

import { useState } from 'react';
import { Button } from '@moryflow/ui/components/button';
import { Download, RotateCcw } from 'lucide-react';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useTranslation } from '@/lib/i18n';

const isRenderableStatus = (status: string) =>
  status === 'available' || status === 'downloading' || status === 'downloaded';

export const SidebarUpdateCard = () => {
  const { t } = useTranslation('settings');
  const { isLoaded, state, downloadUpdate, skipVersion, restartToInstall } = useAppUpdate();
  const [pendingAction, setPendingAction] = useState<'download' | 'skip' | 'restart' | null>(null);

  if (!isLoaded || !state || !isRenderableStatus(state.status)) {
    return null;
  }

  const version = state.availableVersion ?? state.downloadedVersion;
  if (!version) {
    return null;
  }

  const handleAction = async (
    action: 'download' | 'skip' | 'restart',
    runner: () => Promise<unknown>
  ) => {
    setPendingAction(action);
    try {
      await runner();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-background px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {state.status === 'downloaded'
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
        {state.status === 'downloaded' ? (
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

        {state.status === 'available' || state.status === 'downloaded' ? (
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
