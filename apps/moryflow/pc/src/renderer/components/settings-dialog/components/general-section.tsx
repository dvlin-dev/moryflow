import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Switch } from '@moryflow/ui/components/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { toast } from 'sonner';
import { Loader, RefreshCw } from 'lucide-react';
import type { AppCloseBehavior, LaunchAtLoginState } from '@shared/ipc';
import { previewTheme, type ThemePreference } from '@/theme';
import { LanguageSwitcher } from './language-switcher';
import { SandboxSettings } from './sandbox-settings';
import { useTranslation } from '@/lib/i18n';
import type { Control } from 'react-hook-form';
import type { FormValues } from '../const';

type ThemeOption = {
  value: ThemePreference;
  labelKey: 'light' | 'dark' | 'system';
};

type CloseBehaviorOption = {
  value: AppCloseBehavior;
  labelKey: 'closeBehaviorHide' | 'closeBehaviorQuit';
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'light' },
  { value: 'dark', labelKey: 'dark' },
  { value: 'system', labelKey: 'system' },
];

const CLOSE_BEHAVIOR_OPTIONS: CloseBehaviorOption[] = [
  { value: 'hide_to_menubar', labelKey: 'closeBehaviorHide' },
  { value: 'quit', labelKey: 'closeBehaviorQuit' },
];

type GeneralSectionProps = {
  control: Control<FormValues>;
};

export const GeneralSection = ({ control }: GeneralSectionProps) => {
  const { t } = useTranslation('settings');
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [updatingCloseBehavior, setUpdatingCloseBehavior] = useState(false);
  const [updatingLaunchAtLogin, setUpdatingLaunchAtLogin] = useState(false);
  const [closeBehavior, setCloseBehavior] = useState<AppCloseBehavior>('hide_to_menubar');
  const [launchAtLogin, setLaunchAtLogin] = useState<LaunchAtLoginState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRuntimeSettings = async () => {
      if (!window.desktopAPI?.appRuntime) {
        setRuntimeLoading(false);
        return;
      }

      try {
        const [nextCloseBehavior, nextLaunchAtLogin] = await Promise.all([
          window.desktopAPI.appRuntime.getCloseBehavior(),
          window.desktopAPI.appRuntime.getLaunchAtLogin(),
        ]);

        if (cancelled) {
          return;
        }
        setCloseBehavior(nextCloseBehavior);
        setLaunchAtLogin(nextLaunchAtLogin);
      } catch (error) {
        console.error('[settings-dialog] failed to load app runtime settings', error);
        if (!cancelled) {
          toast.error(t('runtimeSettingsLoadFailed'));
        }
      } finally {
        if (!cancelled) {
          setRuntimeLoading(false);
        }
      }
    };

    void loadRuntimeSettings();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleCloseBehaviorChange = useCallback(
    async (nextValue: string) => {
      if (!window.desktopAPI?.appRuntime) {
        return;
      }
      const nextBehavior: AppCloseBehavior = nextValue === 'quit' ? 'quit' : 'hide_to_menubar';
      const previousBehavior = closeBehavior;
      setCloseBehavior(nextBehavior);

      try {
        setUpdatingCloseBehavior(true);
        const savedBehavior = await window.desktopAPI.appRuntime.setCloseBehavior(nextBehavior);
        setCloseBehavior(savedBehavior);
      } catch (error) {
        console.error('[settings-dialog] failed to update close behavior', error);
        setCloseBehavior(previousBehavior);
        toast.error(t('closeBehaviorUpdateFailed'));
      } finally {
        setUpdatingCloseBehavior(false);
      }
    },
    [closeBehavior, t]
  );

  const handleLaunchAtLoginToggle = useCallback(
    async (enabled: boolean) => {
      if (!window.desktopAPI?.appRuntime || !launchAtLogin?.supported) {
        return;
      }

      const previous = launchAtLogin;
      setLaunchAtLogin({ ...previous, enabled });

      try {
        setUpdatingLaunchAtLogin(true);
        const next = await window.desktopAPI.appRuntime.setLaunchAtLogin(enabled);
        setLaunchAtLogin(next);
      } catch (error) {
        console.error('[settings-dialog] failed to update launch at login', error);
        setLaunchAtLogin(previous);
        toast.error(t('launchAtLoginUpdateFailed'));
      } finally {
        setUpdatingLaunchAtLogin(false);
      }
    },
    [launchAtLogin, t]
  );

  const resettingRef = useRef(false);

  const handleReset = useCallback(async () => {
    if (resettingRef.current) return;
    if (!window.desktopAPI?.maintenance?.resetApp) {
      setFeedback({ type: 'error', text: t('resetSettingsNotSupported') });
      return;
    }

    const confirmed = window.confirm(t('resetSettingsConfirm'));
    if (!confirmed) return;

    resettingRef.current = true;
    try {
      setResetting(true);
      setFeedback(null);
      const result = await window.desktopAPI.maintenance.resetApp();
      if (result.success) {
        setFeedback({ type: 'success', text: t('resetSettingsSuccess') });
      } else {
        resettingRef.current = false;
        setFeedback({ type: 'error', text: result.error || t('resetSettingsFailed') });
      }
    } catch (error) {
      resettingRef.current = false;
      console.error('[settings-dialog] reset app failed', error);
      setFeedback({ type: 'error', text: t('resetSettingsFailed') });
    } finally {
      setResetting(false);
    }
  }, [t]);

  const runtimeDisabled = runtimeLoading || updatingCloseBehavior;
  const closeBehaviorSupported = runtimeLoading || launchAtLogin?.supported !== false;

  return (
    <div className="space-y-6">
      <LanguageSwitcher />

      <SandboxSettings />

      {closeBehaviorSupported ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium">{t('closeBehavior')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('closeBehaviorDescription')}</p>
          </div>
          <Select
            value={closeBehavior}
            onValueChange={(value) => {
              void handleCloseBehaviorChange(value);
            }}
            disabled={runtimeDisabled}
          >
            <SelectTrigger size="sm" className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {CLOSE_BEHAVIOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {launchAtLogin?.supported ? (
        <div className="flex items-start justify-between gap-4 rounded-xl bg-background p-4">
          <div>
            <h3 className="text-sm font-medium">{t('launchAtLogin')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('launchAtLoginDescription')}</p>
          </div>
          <Switch
            checked={launchAtLogin.enabled}
            disabled={runtimeLoading || updatingLaunchAtLogin}
            onCheckedChange={(checked) => {
              void handleLaunchAtLoginToggle(checked);
            }}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">{t('theme')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('themeDescription')}</p>
        </div>
        <Controller
          control={control}
          name="ui.theme"
          render={({ field }) => (
            <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
              {THEME_OPTIONS.map((option) => {
                const isSelected = field.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const preference = option.value;
                      field.onChange(preference);
                      previewTheme(preference);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-fast ${
                      isSelected
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <div className="space-y-3 rounded-xl bg-background p-4">
        <div>
          <h3 className="text-sm font-medium">{t('resetSettings')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('resetSettingsDescription')}</p>
        </div>
        {feedback && (
          <p
            className={`text-xs ${
              feedback.type === 'success' ? 'text-success' : 'text-destructive'
            }`}
          >
            {feedback.text}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={resetting}
          onClick={handleReset}
          className="text-destructive hover:text-destructive"
        >
          {resetting ? (
            <Loader className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" />
          )}
          {t('resetButton')}
        </Button>
      </div>
    </div>
  );
};
