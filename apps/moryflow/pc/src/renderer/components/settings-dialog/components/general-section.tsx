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

/* ── Shared row layout for grouped settings ── */

const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/40">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <div className="shrink-0">{children}</div>
  </div>
);

const SectionLabel = ({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) => (
  <h3
    className={`px-0.5 text-xs font-semibold uppercase tracking-wide ${
      variant === 'danger' ? 'text-destructive' : 'text-muted-foreground'
    }`}
  >
    {children}
  </h3>
);

const SectionCard = ({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) => (
  <div
    className={`overflow-hidden rounded-xl border shadow-xs ${
      variant === 'danger' ? 'border-destructive/20' : 'border-border/60'
    }`}
  >
    {children}
  </div>
);

/* ── Component ── */

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
  const hasAppRuntime = !!window.desktopAPI?.appRuntime;

  return (
    <div className="space-y-5">
      {/* ── Appearance ── */}
      <div className="space-y-1.5">
        <SectionLabel>{t('appearance')}</SectionLabel>
        <SectionCard>
          <LanguageSwitcher />
          <SettingRow label={t('theme')}>
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
                        aria-pressed={isSelected}
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
          </SettingRow>
        </SectionCard>
      </div>

      {/* ── Behavior ── */}
      {(hasAppRuntime || launchAtLogin?.supported) && (
        <div className="space-y-1.5">
          <SectionLabel>{t('preferences')}</SectionLabel>
          <SectionCard>
            {hasAppRuntime && (
              <SettingRow label={t('closeBehavior')}>
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
              </SettingRow>
            )}
            {launchAtLogin?.supported && (
              <SettingRow label={t('launchAtLogin')}>
                <Switch
                  checked={launchAtLogin.enabled}
                  disabled={runtimeLoading || updatingLaunchAtLogin}
                  onCheckedChange={(checked) => {
                    void handleLaunchAtLoginToggle(checked);
                  }}
                />
              </SettingRow>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Sandbox ── */}
      <div className="space-y-1.5">
        <SectionLabel>{t('sandboxSettings')}</SectionLabel>
        <SectionCard>
          <SandboxSettings />
        </SectionCard>
      </div>

      {/* ── Danger Zone ── */}
      <div className="space-y-1.5">
        <SectionLabel variant="danger">{t('advanced')}</SectionLabel>
        <SectionCard variant="danger">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <span className="text-sm font-medium text-foreground">{t('resetSettings')}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('resetSettingsDescription')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resetting}
              onClick={handleReset}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              {resetting ? (
                <Loader className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-3.5" />
              )}
              {t('resetButton')}
            </Button>
          </div>
          {feedback && (
            <p
              className={`border-t border-border/40 px-4 py-2 text-xs ${
                feedback.type === 'success' ? 'text-success' : 'text-destructive'
              }`}
            >
              {feedback.text}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
