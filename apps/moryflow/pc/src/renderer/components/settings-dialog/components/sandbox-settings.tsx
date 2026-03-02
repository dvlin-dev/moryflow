/**
 * [PROPS]: none (uses global state)
 * [EMITS]: none
 * [POS]: 外部路径授权设置组件（仅管理 External Paths）
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Label } from '@moryflow/ui/components/label';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@moryflow/ui/components/alert-dialog';
import { Delete, Folder, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import type { SandboxSettings as SandboxSettingsType } from '@shared/ipc';

const normalizePath = (value: string): string => value.trim();
const isAbsolutePath = (value: string): boolean =>
  value.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\');

export const SandboxSettings = () => {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState<SandboxSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizedInput = useMemo(() => normalizePath(pathInput), [pathInput]);
  const pathValidationError = useMemo(() => {
    if (normalizedInput.length === 0) {
      return null;
    }
    if (!isAbsolutePath(normalizedInput)) {
      return t('sandboxPathMustBeAbsolute');
    }
    return null;
  }, [normalizedInput, t]);
  const canAddPath = normalizedInput.length > 0 && !pathValidationError;

  const reloadSettings = useCallback(async () => {
    const result = await window.desktopAPI.sandbox.getSettings();
    setSettings(result);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await reloadSettings();
      } catch (error) {
        console.error('[sandbox-settings] failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadSettings();
  }, [reloadSettings]);

  const handleAddPath = useCallback(async () => {
    if (!canAddPath) {
      return;
    }
    try {
      setSubmitting(true);
      await window.desktopAPI.sandbox.addAuthorizedPath(normalizedInput);
      await reloadSettings();
      setPathInput('');
    } catch (error) {
      console.error('[sandbox-settings] failed to add path:', error);
      toast.error(t('operationFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [canAddPath, normalizedInput, reloadSettings, t]);

  const handleRemovePath = useCallback(
    async (targetPath: string) => {
      try {
        await window.desktopAPI.sandbox.removeAuthorizedPath(targetPath);
        await reloadSettings();
      } catch (error) {
        console.error('[sandbox-settings] failed to remove path:', error);
        toast.error(t('operationFailed'));
      }
    },
    [reloadSettings, t]
  );

  const handleClearAllPaths = useCallback(async () => {
    try {
      await window.desktopAPI.sandbox.clearAuthorizedPaths();
      await reloadSettings();
    } catch (error) {
      console.error('[sandbox-settings] failed to clear paths:', error);
      toast.error(t('operationFailed'));
    } finally {
      setShowClearConfirm(false);
    }
  }, [reloadSettings, t]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('sandboxAuthorizedPaths')}</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-14 rounded-xl bg-muted/50" />
          <div className="h-14 rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{t('sandboxAuthorizedPaths')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('sandboxAuthorizedPathsDescription')}
          </p>
        </div>
        {settings.authorizedPaths.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            className="text-destructive hover:text-destructive"
          >
            <Delete className="mr-1.5 size-3.5" />
            {t('sandboxClearAllPaths')}
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="external-path-input">{t('sandboxAddPath')}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="external-path-input"
            value={pathInput}
            onChange={(event) => setPathInput(event.target.value)}
            placeholder={t('sandboxPathPlaceholder')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleAddPath()}
            disabled={!canAddPath || submitting}
          >
            <Plus className="mr-1.5 size-3.5" />
            {t('sandboxAddPath')}
          </Button>
        </div>
        {pathValidationError ? (
          <p className="text-xs text-destructive">{pathValidationError}</p>
        ) : null}
      </div>

      {settings.authorizedPaths.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">{t('sandboxNoAuthorizedPaths')}</p>
      ) : (
        <div className="space-y-2">
          {settings.authorizedPaths.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate text-xs">{item}</code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => void handleRemovePath(item)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sandboxClearAllPaths')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sandboxClearAllConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleClearAllPaths()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('sandboxClearAllPaths')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
