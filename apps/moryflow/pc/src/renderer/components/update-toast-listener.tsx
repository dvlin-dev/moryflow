/**
 * [PROVIDES]: Global toast notifications for app update state transitions
 * [DEPENDS]: use-app-update store, sonner toast
 * [POS]: Mounted globally in App.tsx — complements sidebar update card
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAppUpdate } from '@/hooks/use-app-update';

export const UpdateToastListener = () => {
  const { t } = useTranslation('workspace');
  const { state, settings, downloadUpdate, restartToInstall } = useAppUpdate();
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state) return;

    const signature = [state.status, state.availableVersion, state.errorMessage].join(':');
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    // Only show "available" toast when autoDownload is OFF — when ON, the
    // download starts immediately so "available" is a transient state.
    if (state.status === 'available' && state.availableVersion && !settings?.autoDownload) {
      toast.info(t('updateVersionAvailable', { version: state.availableVersion }), {
        action: {
          label: t('updateDownloadAction'),
          onClick: () => void downloadUpdate(),
        },
      });
      return;
    }

    if (state.status === 'downloaded' && (state.downloadedVersion ?? state.availableVersion)) {
      const version = state.downloadedVersion ?? state.availableVersion;
      toast.success(t('updateReadyToInstall', { version: version ?? '' }), {
        action: {
          label: t('updateRestartAction'),
          onClick: () => void restartToInstall(),
        },
      });
      return;
    }

    if (state.status === 'error' && state.errorMessage) {
      toast.error(state.errorMessage);
    }
  }, [state, settings, downloadUpdate, restartToInstall, t]);

  return null;
};
