/**
 * [PROPS]: none（通过 useFormContext 取数）
 * [EMITS]: none
 * [POS]: Telegram 配置 Bot Token 密文输入区
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
import type { FormValues } from './telegram-form-schema';

export const TelegramBotToken = () => {
  const { control } = useFormContext<FormValues>();

  return (
    <FormField
      control={control}
      name="botToken"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bot Token</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="password"
              placeholder="Paste token from @BotFather"
              autoComplete="off"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
