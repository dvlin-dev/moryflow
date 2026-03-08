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
import { GROUP_POLICY_OPTIONS, type FormValues } from './telegram-form-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasWebhookSecret: boolean;
};

export const TelegramDeveloperSettings = ({ open, onOpenChange, hasWebhookSecret }: Props) => {
  const { control, watch } = useFormContext<FormValues>();
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
          <ChevronDown className={`size-3 transition-transform ${open ? '' : '-rotate-90'}`} />
          Developer Settings
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 overflow-hidden rounded-xl bg-background px-5 py-5">
        <div className="space-y-5">
          {/* Enable/Disable */}
          <FormField
            control={control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Enable Telegram Bot</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator />

          {/* Group settings */}
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Group
            </span>
            <FormField
              control={control}
              name="groupPolicy"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Group Policy</FormLabel>
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
                            {opt.label}
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
                    <FormLabel className="text-xs">Group Allowlist (one ID per line)</FormLabel>
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
                  <FormLabel>Require @mention in groups</FormLabel>
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
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Runtime
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Runtime Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="polling">Polling (Default)</SelectItem>
                        <SelectItem value="webhook">Webhook (Opt-in)</SelectItem>
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
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/telegram/webhook" />
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
                    <FormLabel>Webhook Secret</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="secret" autoComplete="off" />
                    </FormControl>
                    {hasWebhookSecret && (
                      <p className="text-xs text-muted-foreground">
                        Saved. Leave empty to keep unchanged.
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
                    <FormLabel>Webhook Listen Host</FormLabel>
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
                    <FormLabel>Webhook Listen Port</FormLabel>
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
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Polling
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={control}
                name="pollingTimeoutSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (sec)</FormLabel>
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
                    <FormLabel>Idle Delay (ms)</FormLabel>
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
                    <FormLabel>Batch Size</FormLabel>
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
                    <FormLabel>Pairing TTL (sec)</FormLabel>
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
                    <FormLabel>Send Retry Attempts</FormLabel>
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
                    <FormLabel>Draft Streaming</FormLabel>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Stream intermediate reply drafts in private chat.
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
                  <FormLabel>Draft Flush Interval (ms)</FormLabel>
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
