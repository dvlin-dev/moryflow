import { useCallback, useState } from 'react'
import { Controller } from 'react-hook-form'
import { RadioGroup, RadioGroupItem } from '@anyhunt/ui/components/radio-group'
import { Label } from '@anyhunt/ui/components/label'
import { Button } from '@anyhunt/ui/components/button'
import { Loader2Icon, SunIcon, MoonIcon, MonitorIcon, RotateCcwIcon } from 'lucide-react'
import { previewTheme, type ThemePreference } from '@/theme'
import { LanguageSwitcher } from './language-switcher'
import { SandboxSettings } from './sandbox-settings'
import { useTranslation } from '@/lib/i18n'
import type { Control } from 'react-hook-form'
import type { FormValues } from '../const'

type ThemeOption = {
  value: ThemePreference
  labelKey: 'light' | 'dark' | 'system'
  descriptionKey: 'lightModeDescription' | 'darkModeDescription' | 'systemModeDescription'
  icon: typeof SunIcon
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', labelKey: 'light', descriptionKey: 'lightModeDescription', icon: SunIcon },
  { value: 'dark', labelKey: 'dark', descriptionKey: 'darkModeDescription', icon: MoonIcon },
  { value: 'system', labelKey: 'system', descriptionKey: 'systemModeDescription', icon: MonitorIcon },
]

type GeneralSectionProps = {
  control: Control<FormValues>
}

export const GeneralSection = ({ control }: GeneralSectionProps) => {
  const { t } = useTranslation('settings')
  const [resetting, setResetting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleReset = useCallback(async () => {
    if (!window.desktopAPI?.maintenance?.resetApp) {
      setFeedback({ type: 'error', text: t('resetSettingsNotSupported') })
      return
    }

    // 二次确认
    const confirmed = window.confirm(t('resetSettingsConfirm'))
    if (!confirmed) return

    try {
      setResetting(true)
      setFeedback(null)
      const result = await window.desktopAPI.maintenance.resetApp()
      if (result.success) {
        setFeedback({ type: 'success', text: t('resetSettingsSuccess') })
      } else {
        setFeedback({ type: 'error', text: result.error || t('resetSettingsFailed') })
      }
    } catch (error) {
      console.error('[settings-dialog] reset app failed', error)
      setFeedback({ type: 'error', text: t('resetSettingsFailed') })
    } finally {
      setResetting(false)
    }
  }, [t])

  return (
    <div className="space-y-6">
      {/* 语言切换 */}
      <LanguageSwitcher />

      {/* 沙盒设置 */}
      <SandboxSettings />

      {/* 主题模式 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('theme')}</h3>
        <Controller
          control={control}
          name="ui.theme"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                const preference = value as ThemePreference
                field.onChange(preference)
                previewTheme(preference)
              }}
              className="grid gap-3 sm:grid-cols-3"
            >
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = field.value === option.value
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
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-medium">{t(option.labelKey)}</span>
                    </div>
                    <span className="pl-[38px] text-xs text-muted-foreground">{t(option.descriptionKey)}</span>
                  </Label>
                )
              })}
            </RadioGroup>
          )}
        />
      </div>

      <div className="space-y-3 rounded-xl bg-background p-4">
        <div>
          <h3 className="text-sm font-medium">{t('resetSettings')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('resetSettingsDescription')}
          </p>
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
            <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <RotateCcwIcon className="mr-1.5 size-3.5" />
          )}
          {t('resetButton')}
        </Button>
      </div>
    </div>
  )
}
