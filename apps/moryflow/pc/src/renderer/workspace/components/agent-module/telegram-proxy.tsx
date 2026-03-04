/**
 * [PROPS]: testingProxy, proxyTestResult, onTestProxy
 * [EMITS]: none
 * [POS]: Telegram 配置 Proxy 开关 + URL 输入 + 连通测试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useFormContext } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Switch } from '@moryflow/ui/components/switch';
import { FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import { Loader } from 'lucide-react';
import type { TelegramProxyTestResult } from '@shared/ipc';
import type { FormValues } from './telegram-form-schema';

type Props = {
  testingProxy: boolean;
  proxyTestResult: TelegramProxyTestResult | null;
  onTestProxy: () => void;
};

export const TelegramProxy = ({ testingProxy, proxyTestResult, onTestProxy }: Props) => {
  const { control, watch } = useFormContext<FormValues>();
  const proxyEnabled = watch('proxyEnabled');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Proxy</span>
        <FormField
          control={control}
          name="proxyEnabled"
          render={({ field }) => (
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          )}
        />
      </div>

      {proxyEnabled && (
        <div className="space-y-2">
          <FormField
            control={control}
            name="proxyUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="http://127.0.0.1:6152"
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestProxy}
              disabled={testingProxy}
            >
              {testingProxy && <Loader className="mr-1.5 size-3.5 animate-spin" />}
              Test Proxy
            </Button>
            {proxyTestResult && (
              <span
                className={`text-xs ${proxyTestResult.ok ? 'text-emerald-600' : 'text-destructive'}`}
              >
                {proxyTestResult.message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
