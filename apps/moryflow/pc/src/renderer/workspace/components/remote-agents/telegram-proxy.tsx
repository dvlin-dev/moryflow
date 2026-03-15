/**
 * [PROPS]: testingProxy, proxyTestResult, networkGuidance, onTestProxy
 * [EMITS]: none
 * [POS]: Telegram 配置 Proxy 开关 + URL 输入 + 连通测试 + 网络错误引导提示
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useFormContext } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Switch } from '@moryflow/ui/components/switch';
import { FormControl, FormField, FormItem, FormMessage } from '@moryflow/ui/components/form';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { TelegramProxyTestResult } from '@shared/ipc';
import type { FormValues } from './telegram-form-schema';

type Props = {
  testingProxy: boolean;
  proxyTestResult: TelegramProxyTestResult | null;
  networkGuidance: string | null;
  onTestProxy: () => void;
};

export const TelegramProxy = ({
  testingProxy,
  proxyTestResult,
  networkGuidance,
  onTestProxy,
}: Props) => {
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

      {networkGuidance && (
        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{networkGuidance}</p>
        </div>
      )}

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
              {testingProxy && <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />}
              Test Proxy
            </Button>
            {proxyTestResult && (
              <span
                className={`text-xs ${proxyTestResult.ok ? 'text-success' : 'text-destructive'}`}
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
