/**
 * [PROPS]: open, onOpenChange, hasWebhookSecret
 * [EMITS]: none
 * [POS]: Telegram Developer Settings 折叠区（Enable 开关、Group 策略、Webhook、Polling、Draft Streaming）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useFormContext } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Switch } from '@moryflow/ui/components/switch';
import { Textarea } from '@moryflow/ui/components/textarea';
import { Separator } from '@moryflow/ui/components/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@moryflow/ui/components/collapsible';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { GROUP_POLICY_OPTIONS, type FormValues } from './telegram-form-schema';

const GROUP_POLICY_LABEL_KEYS = {
  allowlist: 'telegramGroupPolicyAllowlist',
  open: 'telegramGroupPolicyOpen',
  disabled: 'telegramGroupPolicyDisabled',
} as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasWebhookSecret: boolean;
};

export const TelegramDeveloperSettings = ({ open, onOpenChange, hasWebhookSecret }: Props) => {
  const { control, watch } = useFormContext<FormValues>();
  const { t } = useTranslation('workspace');
  const groupPolicy = watch('groupPolicy');

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5 px-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('size-3 transition-transform', !open && '-rotate-90')} />
          {t('telegramDeveloperSettings')}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 overflow-hidden rounded-xl border border-border/60 bg-background px-5 py-5">
        <div className="space-y-5">
          {/* Enable/Disable */}
          <FormField
            control={control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>{t('telegramEnableBot')}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator />

          {/* Group settings */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t('telegramGroup')}
            </span>
            <FormField
              control={control}
              name="groupPolicy"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>{t('telegramGroupPolicy')}</FormLabel>
                  <div className="w-36">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GROUP_POLICY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(GROUP_POLICY_LABEL_KEYS[opt.value])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              )}
            />
            {groupPolicy === 'allowlist' && (
              <FormField
                control={control}
                name="groupAllowFromText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('telegramGroupAllowlist')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="123456789" />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={control}
              name="requireMentionByDefault"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>{t('telegramRequireMention')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Webhook / Runtime mode */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t('telegramRuntime')}
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramRuntimeMode')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="polling">{t('telegramPollingDefault')}</SelectItem>
                        <SelectItem value="webhook">{t('telegramWebhookOptIn')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="webhookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramWebhookUrl')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('telegramWebhookUrlPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="webhookSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramWebhookSecret')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="secret" autoComplete="off" />
                    </FormControl>
                    {hasWebhookSecret && (
                      <p className="text-xs text-muted-foreground">
                        {t('telegramWebhookSecretSaved')}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="webhookListenHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramWebhookListenHost')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="127.0.0.1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="webhookListenPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramWebhookListenPort')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} max={65535} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Polling */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t('telegramPolling')}
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={control}
                name="pollingTimeoutSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramTimeout')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={5} max={60} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="pollingIdleDelayMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramIdleDelay')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={100} max={5000} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="pollingMaxBatchSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramBatchSize')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} max={100} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="pairingCodeTtlSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramPairingTtl')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={60} max={86400} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="maxSendRetries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('telegramSendRetryAttempts')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} max={8} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Draft Streaming */}
          <div className="space-y-3">
            <FormField
              control={control}
              name="enableDraftStreaming"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>{t('telegramDraftStreaming')}</FormLabel>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('telegramDraftStreamingDescription')}
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="draftFlushIntervalMs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('telegramDraftFlushInterval')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={200} max={2000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
