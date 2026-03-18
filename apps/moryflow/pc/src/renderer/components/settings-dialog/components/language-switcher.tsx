/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 语言切换组件，用于设置页面通用 tab（Select 下拉框）
 */

import { useLanguage, useTranslation } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';

export function LanguageSwitcher() {
  const { t } = useTranslation('settings');
  const { currentLanguage, changeLanguage, languages, isChanging } = useLanguage();

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-medium">{t('language')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('languageDescription')}</p>
      </div>
      <Select
        value={currentLanguage}
        onValueChange={(value) => changeLanguage(value as typeof currentLanguage)}
        disabled={isChanging}
      >
        <SelectTrigger size="sm" className="min-w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="mr-1.5">{lang.flag}</span>
              {lang.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
