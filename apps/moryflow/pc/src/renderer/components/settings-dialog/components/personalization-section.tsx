/**
 * [PROPS]: PersonalizationSectionProps - 个性化设置表单
 * [EMITS]: none
 * [POS]: Settings Dialog 的 personalization 标签页
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Controller, type Control } from 'react-hook-form';
import { Label } from '@moryflow/ui/components/label';
import { Textarea } from '@moryflow/ui/components/textarea';
import { useTranslation } from '@/lib/i18n';
import type { FormValues } from '../const';

type PersonalizationSectionProps = {
  control: Control<FormValues>;
};

export const PersonalizationSection = ({ control }: PersonalizationSectionProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-2 rounded-xl bg-background p-4">
      <div>
        <Label htmlFor="custom-instructions">{t('customInstructionsLabel')}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{t('customInstructionsHint')}</p>
      </div>
      <Controller
        control={control}
        name="personalization.customInstructions"
        render={({ field }) => (
          <Textarea
            id="custom-instructions"
            rows={12}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            placeholder={t('customInstructionsPlaceholder')}
          />
        )}
      />
    </div>
  );
};
