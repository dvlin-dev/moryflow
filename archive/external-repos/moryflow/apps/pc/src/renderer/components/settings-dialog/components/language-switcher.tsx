/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 语言切换组件，用于设置页面通用 tab
 */

import { useLanguage, useTranslation } from '@/lib/i18n'
import { RadioGroup, RadioGroupItem } from '@moryflow/ui/components/radio-group'
import { Label } from '@moryflow/ui/components/label'
import { GlobeIcon } from 'lucide-react'

export function LanguageSwitcher() {
  const { t } = useTranslation('settings')
  const { currentLanguage, changeLanguage, languages, isChanging } = useLanguage()

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('language')}</h3>
      <RadioGroup
        value={currentLanguage}
        onValueChange={(value) => changeLanguage(value as typeof currentLanguage)}
        disabled={isChanging}
        className="grid gap-3 sm:grid-cols-3"
      >
        {languages.map((lang) => {
          const isSelected = currentLanguage === lang.code
          return (
            <Label
              key={lang.code}
              className={`flex cursor-pointer flex-col gap-2 rounded-xl p-3 text-sm transition-all duration-fast ${
                isSelected
                  ? 'bg-background shadow-sm ring-1 ring-border'
                  : 'bg-muted/30 hover:bg-muted/50'
              } ${isChanging ? 'pointer-events-none opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <RadioGroupItem value={lang.code} className="sr-only" />
                <div
                  className={`flex size-7 items-center justify-center rounded-lg text-base transition-colors ${
                    isSelected ? 'bg-foreground text-background' : 'bg-muted'
                  }`}
                >
                  {isSelected ? lang.flag : <GlobeIcon className="size-3.5" />}
                </div>
                <span className="font-medium">{lang.name}</span>
              </div>
              <span className="pl-[38px] text-xs text-muted-foreground">{lang.nativeName}</span>
            </Label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
