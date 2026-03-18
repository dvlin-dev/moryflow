/**
 * [PROPS]: none（通过 useFormContext 取数）
 * [EMITS]: none
 * [POS]: Telegram 配置 Bot Token 密文输入区
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useFormContext } from 'react-hook-form';
import { Input } from '@moryflow/ui/components/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import { useTranslation } from '@/lib/i18n';
import type { FormValues } from './telegram-form-schema';

export const TelegramBotToken = () => {
  const { control } = useFormContext<FormValues>();
  const { t } = useTranslation('workspace');

  return (
    <FormField
      control={control}
      name="botToken"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('telegramBotTokenLabel')}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="password"
              placeholder={t('telegramBotTokenPlaceholder')}
              autoComplete="off"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
