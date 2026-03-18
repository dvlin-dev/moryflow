/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 语言切换行，嵌入 GeneralSection 的 Appearance 分组卡片
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
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm font-medium text-foreground">{t('language')}</span>
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
