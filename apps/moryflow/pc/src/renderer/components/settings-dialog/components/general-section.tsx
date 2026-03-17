import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@moryflow/ui/components/radio-group';
import { Label } from '@moryflow/ui/components/label';
import { Button } from '@moryflow/ui/components/button';
import { Switch } from '@moryflow/ui/components/switch';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { Computer, Loader, Moon, RefreshCw, Sun } from 'lucide-react';
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
  descriptionKey: 'lightModeDescription' | 'darkModeDescription' | 'systemModeDescription';
  icon: LucideIcon;
};

type CloseBehaviorOption = {
  value: AppCloseBehavior;
  labelKey: 'closeBehaviorHide' | 'closeBehaviorQuit';
  descriptionKey: 'closeBehaviorHideDescription' | 'closeBehaviorQuitDescription';
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'light', descriptionKey: 'lightModeDescription', icon: Sun },
  { value: 'dark', labelKey: 'dark', descriptionKey: 'darkModeDescription', icon: Moon },
  {
    value: 'system',
    labelKey: 'system',
    descriptionKey: 'systemModeDescription',
    icon: Computer,
  },
];

const CLOSE_BEHAVIOR_OPTIONS: CloseBehaviorOption[] = [
  {
    value: 'hide_to_menubar',
    labelKey: 'closeBehaviorHide',
    descriptionKey: 'closeBehaviorHideDescription',
  },
  {
    value: 'quit',
    labelKey: 'closeBehaviorQuit',
    descriptionKey: 'closeBehaviorQuitDescription',
  },
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
        <div className="space-y-3 rounded-xl bg-background p-4">
          <div>
            <h3 className="text-sm font-medium">{t('closeBehavior')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('closeBehaviorDescription')}</p>
          </div>
          <RadioGroup
            value={closeBehavior}
            onValueChange={(value) => {
              void handleCloseBehaviorChange(value);
            }}
            className={`grid gap-2${runtimeDisabled ? ' pointer-events-none opacity-60' : ''}`}
          >
            {CLOSE_BEHAVIOR_OPTIONS.map((option) => {
              const isSelected = closeBehavior === option.value;
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
                    <span className="font-medium">{t(option.labelKey)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t(option.descriptionKey)}</span>
                </Label>
              );
            })}
          </RadioGroup>
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

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('theme')}</h3>
        <Controller
          control={control}
          name="ui.theme"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                const preference = value as ThemePreference;
                field.onChange(preference);
                previewTheme(preference);
              }}
              className="grid gap-3 sm:grid-cols-3"
            >
              {THEME_OPTIONS.map((option) => {
                const ThemeIcon = option.icon;
                const isSelected = field.value === option.value;
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
                        <ThemeIcon className="size-3.5" />
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
