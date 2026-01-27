/**
 * [PROPS]: none (uses global state)
 * [EMITS]: none
 * [POS]: 沙盒设置组件，用于切换沙盒模式和管理授权路径（Lucide 图标）
 */

import { useCallback, useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@anyhunt/ui/components/radio-group';
import { Label } from '@anyhunt/ui/components/label';
import { Button } from '@anyhunt/ui/components/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@anyhunt/ui/components/alert-dialog';
import type { LucideIcon } from 'lucide-react';
import { X, Delete, Folder, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { SandboxMode } from '@anyhunt/agents-sandbox';
import type { SandboxSettings as SandboxSettingsType } from '@shared/ipc';

type ModeOption = {
  value: SandboxMode;
  labelKey: 'sandboxModeNormal' | 'sandboxModeUnrestricted';
  descriptionKey: 'sandboxModeNormalDescription' | 'sandboxModeUnrestrictedDescription';
  icon: LucideIcon;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'normal',
    labelKey: 'sandboxModeNormal',
    descriptionKey: 'sandboxModeNormalDescription',
    icon: Shield,
  },
  {
    value: 'unrestricted',
    labelKey: 'sandboxModeUnrestricted',
    descriptionKey: 'sandboxModeUnrestrictedDescription',
    icon: Shield,
  },
];

export const SandboxSettings = () => {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState<SandboxSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await window.desktopAPI.sandbox.getSettings();
        setSettings(result);
      } catch (error) {
        console.error('[sandbox-settings] failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 切换模式
  const handleModeChange = useCallback(async (mode: SandboxMode) => {
    try {
      await window.desktopAPI.sandbox.setMode(mode);
      setSettings((prev: SandboxSettingsType | null) => (prev ? { ...prev, mode } : null));
    } catch (error) {
      console.error('[sandbox-settings] failed to set mode:', error);
    }
  }, []);

  // 移除授权路径
  const handleRemovePath = useCallback(async (path: string) => {
    try {
      await window.desktopAPI.sandbox.removeAuthorizedPath(path);
      setSettings((prev: SandboxSettingsType | null) =>
        prev
          ? {
              ...prev,
              authorizedPaths: prev.authorizedPaths.filter((p: string) => p !== path),
            }
          : null
      );
    } catch (error) {
      console.error('[sandbox-settings] failed to remove path:', error);
    }
  }, []);

  // 清除所有授权路径
  const handleClearAllPaths = useCallback(async () => {
    try {
      await window.desktopAPI.sandbox.clearAuthorizedPaths();
      setSettings((prev: SandboxSettingsType | null) =>
        prev ? { ...prev, authorizedPaths: [] } : null
      );
    } catch (error) {
      console.error('[sandbox-settings] failed to clear paths:', error);
    } finally {
      setShowClearConfirm(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('sandboxSettings')}</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-16 rounded-xl bg-muted/50" />
          <div className="h-16 rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">{t('sandboxMode')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('sandboxSettingsDescription')}</p>
        </div>
        <RadioGroup
          value={settings.mode}
          onValueChange={(value) => handleModeChange(value as SandboxMode)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {MODE_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = settings.mode === option.value;
            return (
              <Label
                key={option.value}
                className={`flex cursor-pointer flex-col gap-2 rounded-xl p-3 text-sm transition-all duration-fast ${
                  isSelected
                    ? 'bg-background shadow-sm ring-1 ring-border'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <div
                    className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                      isSelected ? 'bg-foreground text-background' : 'bg-muted'
                    }`}
                  >
                    <OptionIcon className="size-3.5" />
                  </div>
                  <span className="font-medium">{t(option.labelKey)}</span>
                </div>
                <span className="pl-[38px] text-xs text-muted-foreground">
                  {t(option.descriptionKey)}
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      {/* 授权路径列表 */}
      <div className="space-y-3 rounded-xl bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">{t('sandboxAuthorizedPaths')}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('sandboxAuthorizedPathsDescription')}
            </p>
          </div>
          {settings.authorizedPaths.length > 0 && (
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
          )}
        </div>

        {settings.authorizedPaths.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('sandboxNoAuthorizedPaths')}
          </p>
        ) : (
          <div className="space-y-2">
            {settings.authorizedPaths.map((path) => (
              <div key={path} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <code className="flex-1 truncate text-xs">{path}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => handleRemovePath(path)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 清除确认对话框 */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sandboxClearAllPaths')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sandboxClearAllConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllPaths}
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
