/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Agent 模块页内 Telegram Bot API 设置与 Pairing 审批中心
 * [UPDATE]: 2026-03-04 - Proxy 区域默认可见 + Save 后 runtime 失败不清空 bot token 输入
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';
import { toast } from 'sonner';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { Switch } from '@moryflow/ui/components/switch';
import { Badge } from '@moryflow/ui/components/badge';
import { Textarea } from '@moryflow/ui/components/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@moryflow/ui/components/collapsible';
import {
  Form,
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
import { Separator } from '@moryflow/ui/components/separator';
import { ChevronDown, Loader, RefreshCw } from 'lucide-react';
import type {
  TelegramAccountSnapshot,
  TelegramPairingRequestItem,
  TelegramProxyTestResult,
  TelegramRuntimeAccountStatus,
} from '@shared/ipc';

const ALLOWED_PROXY_PROTOCOLS = new Set(['http:', 'https:', 'socks5:']);

export const telegramFormSchema = z
  .object({
    accountId: z.string().min(1),
    enabled: z.boolean(),
    mode: z.enum(['polling', 'webhook']),
    hasStoredBotToken: z.boolean(),
    hasStoredWebhookSecret: z.boolean(),
    hasStoredProxyUrl: z.boolean(),
    botToken: z.string(),
    webhookUrl: z.string(),
    webhookSecret: z.string(),
    proxyEnabled: z.boolean(),
    proxyUrl: z.string(),
    webhookListenHost: z.string(),
    webhookListenPort: z.coerce.number().min(1).max(65535),
    dmPolicy: z.enum(['pairing', 'allowlist', 'open', 'disabled']),
    allowFromText: z.string(),
    groupPolicy: z.enum(['allowlist', 'open', 'disabled']),
    groupAllowFromText: z.string(),
    requireMentionByDefault: z.boolean(),
    pollingTimeoutSeconds: z.coerce.number().min(5).max(60),
    pollingIdleDelayMs: z.coerce.number().min(100).max(5000),
    pollingMaxBatchSize: z.coerce.number().min(1).max(100),
    pairingCodeTtlSeconds: z.coerce.number().min(60).max(86400),
    maxSendRetries: z.coerce.number().min(1).max(8),
    enableDraftStreaming: z.boolean(),
    draftFlushIntervalMs: z.coerce.number().min(200).max(2000),
  })
  .superRefine((values, ctx) => {
    if (values.enabled && !values.botToken.trim() && !values.hasStoredBotToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['botToken'],
        message: 'Bot token is required when channel is enabled.',
      });
    }

    const proxyUrl = values.proxyUrl.trim();
    if (values.proxyEnabled && !proxyUrl && !values.hasStoredProxyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proxyUrl'],
        message: 'Proxy URL is required when proxy is enabled.',
      });
    }

    if (proxyUrl) {
      try {
        const parsed = new URL(proxyUrl);
        if (!ALLOWED_PROXY_PROTOCOLS.has(parsed.protocol)) {
          throw new Error('unsupported protocol');
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['proxyUrl'],
          message: 'Proxy URL must be a valid http/https/socks5 URL.',
        });
      }
    }

    if (values.mode !== 'webhook') {
      return;
    }

    const webhookUrl = values.webhookUrl.trim();
    if (!webhookUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['webhookUrl'],
        message: 'Webhook URL is required in webhook mode.',
      });
    } else {
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('unsupported protocol');
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['webhookUrl'],
          message: 'Webhook URL must be a valid http/https URL.',
        });
      }
    }

    if (!values.webhookSecret.trim() && !values.hasStoredWebhookSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['webhookSecret'],
        message: 'Webhook secret is required in webhook mode.',
      });
    }
  });

type FormValues = z.infer<typeof telegramFormSchema>;

const parseListText = (value: string): string[] => {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
};

const toFormValues = (account: TelegramAccountSnapshot): FormValues => ({
  accountId: account.accountId,
  enabled: account.enabled,
  mode: account.mode,
  hasStoredBotToken: account.hasBotToken,
  hasStoredWebhookSecret: account.hasWebhookSecret,
  hasStoredProxyUrl: account.hasProxyUrl,
  botToken: '',
  webhookUrl: account.webhookUrl ?? '',
  webhookSecret: '',
  proxyEnabled: account.proxyEnabled,
  proxyUrl: '',
  webhookListenHost: account.webhookListenHost,
  webhookListenPort: account.webhookListenPort,
  dmPolicy: account.dmPolicy,
  allowFromText: account.allowFrom.join('\n'),
  groupPolicy: account.groupPolicy,
  groupAllowFromText: account.groupAllowFrom.join('\n'),
  requireMentionByDefault: account.requireMentionByDefault,
  pollingTimeoutSeconds: account.pollingTimeoutSeconds,
  pollingIdleDelayMs: account.pollingIdleDelayMs,
  pollingMaxBatchSize: account.pollingMaxBatchSize,
  pairingCodeTtlSeconds: account.pairingCodeTtlSeconds,
  maxSendRetries: account.maxSendRetries,
  enableDraftStreaming: account.enableDraftStreaming,
  draftFlushIntervalMs: account.draftFlushIntervalMs,
});

const statusLabel = (
  status: TelegramRuntimeAccountStatus | null
): {
  text: string;
  tone: 'default' | 'secondary' | 'destructive' | 'outline';
} => {
  if (!status) {
    return { text: 'Not initialized', tone: 'outline' };
  }
  if (!status.enabled) {
    return { text: 'Disabled', tone: 'outline' };
  }
  if (!status.hasBotToken) {
    return { text: 'Missing token', tone: 'destructive' };
  }
  if (status.running) {
    return { text: 'Running', tone: 'default' };
  }
  return { text: 'Stopped', tone: 'secondary' };
};

const hasRuntimeStartFailure = (status: TelegramRuntimeAccountStatus | null): boolean => {
  if (!status) {
    return false;
  }
  return (
    status.enabled && status.hasBotToken && !status.running && Boolean(status.lastError?.trim())
  );
};

export const TelegramSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [account, setAccount] = useState<TelegramAccountSnapshot | null>(null);
  const [status, setStatus] = useState<TelegramRuntimeAccountStatus | null>(null);
  const [pairingRequests, setPairingRequests] = useState<TelegramPairingRequestItem[]>([]);
  const [pairingPending, setPairingPending] = useState<Record<string, 'approve' | 'deny'>>({});
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<TelegramProxyTestResult | null>(null);
  const [secureStorageAvailable, setSecureStorageAvailable] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(telegramFormSchema) as any,
    defaultValues: {
      accountId: 'default',
      enabled: false,
      mode: 'polling',
      hasStoredBotToken: false,
      hasStoredWebhookSecret: false,
      hasStoredProxyUrl: false,
      botToken: '',
      webhookUrl: '',
      webhookSecret: '',
      proxyEnabled: false,
      proxyUrl: '',
      webhookListenHost: '127.0.0.1',
      webhookListenPort: 8787,
      dmPolicy: 'pairing',
      allowFromText: '',
      groupPolicy: 'allowlist',
      groupAllowFromText: '',
      requireMentionByDefault: true,
      pollingTimeoutSeconds: 25,
      pollingIdleDelayMs: 600,
      pollingMaxBatchSize: 100,
      pairingCodeTtlSeconds: 900,
      maxSendRetries: 3,
      enableDraftStreaming: true,
      draftFlushIntervalMs: 350,
    },
  });

  const loadSnapshot = useCallback(async () => {
    if (!window.desktopAPI?.telegram) {
      return;
    }

    setLoading(true);
    try {
      const [settings, runtimeStatus, secureStorage] = await Promise.all([
        window.desktopAPI.telegram.getSettings(),
        window.desktopAPI.telegram.getStatus(),
        window.desktopAPI.telegram.isSecureStorageAvailable(),
      ]);

      const activeAccount =
        settings.accounts[settings.defaultAccountId] ?? Object.values(settings.accounts)[0] ?? null;
      setAccount(activeAccount);
      setSecureStorageAvailable(secureStorage);
      setProxyTestResult(null);
      if (activeAccount) {
        form.reset(toFormValues(activeAccount));
        setStatus(runtimeStatus.accounts[activeAccount.accountId] ?? null);
        const requests = await window.desktopAPI.telegram.listPairingRequests({
          accountId: activeAccount.accountId,
          status: 'pending',
        });
        setPairingRequests(requests);
      }
    } catch (error) {
      console.error('[agent-module/telegram-section] failed to load snapshot', error);
      toast.error('Failed to load Telegram settings');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!window.desktopAPI?.telegram) {
      return;
    }
    const dispose = window.desktopAPI.telegram.onStatusChange((next) => {
      const accountId = form.getValues('accountId');
      setStatus(next.accounts[accountId] ?? null);
    });
    return () => dispose();
  }, [form]);

  const refreshPairingRequests = useCallback(async () => {
    if (!window.desktopAPI?.telegram || !account) {
      return;
    }
    const requests = await window.desktopAPI.telegram.listPairingRequests({
      accountId: account.accountId,
      status: 'pending',
    });
    setPairingRequests(requests);
  }, [account]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!window.desktopAPI?.telegram) {
        return;
      }

      setSaving(true);
      try {
        setProxyTestResult(null);
        const next = await window.desktopAPI.telegram.updateSettings({
          account: {
            accountId: values.accountId,
            enabled: values.enabled,
            mode: values.mode,
            proxyEnabled: values.proxyEnabled,
            webhookUrl: values.webhookUrl.trim(),
            webhookListenHost: values.webhookListenHost.trim(),
            webhookListenPort: values.webhookListenPort,
            botToken: values.botToken.trim() ? values.botToken.trim() : undefined,
            webhookSecret: values.webhookSecret.trim() ? values.webhookSecret.trim() : undefined,
            proxyUrl: values.proxyUrl.trim() ? values.proxyUrl.trim() : undefined,
            dmPolicy: values.dmPolicy,
            allowFrom: parseListText(values.allowFromText),
            groupPolicy: values.groupPolicy,
            groupAllowFrom: parseListText(values.groupAllowFromText),
            requireMentionByDefault: values.requireMentionByDefault,
            pollingTimeoutSeconds: values.pollingTimeoutSeconds,
            pollingIdleDelayMs: values.pollingIdleDelayMs,
            pollingMaxBatchSize: values.pollingMaxBatchSize,
            pairingCodeTtlSeconds: values.pairingCodeTtlSeconds,
            maxSendRetries: values.maxSendRetries,
            enableDraftStreaming: values.enableDraftStreaming,
            draftFlushIntervalMs: values.draftFlushIntervalMs,
          },
        });

        const updated = next.accounts[values.accountId] ?? null;
        setAccount(updated);
        const runtimeSnapshot = await window.desktopAPI.telegram.getStatus();
        const runtimeAccountStatus = runtimeSnapshot.accounts[values.accountId] ?? null;
        setStatus(runtimeAccountStatus);
        if (hasRuntimeStartFailure(runtimeAccountStatus)) {
          throw new Error(runtimeAccountStatus.lastError);
        }

        if (updated) {
          form.reset(toFormValues(updated));
        }
        toast.success('Telegram settings saved');
        await refreshPairingRequests();
      } catch (error) {
        console.error('[agent-module/telegram-section] failed to save settings', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save Telegram settings');
      } finally {
        setSaving(false);
      }
    },
    [form, refreshPairingRequests]
  );

  const handleTestProxy = useCallback(async () => {
    if (!window.desktopAPI?.telegram) {
      return;
    }

    const isValid = await form.trigger(['proxyEnabled', 'proxyUrl', 'hasStoredProxyUrl']);
    if (!isValid) {
      return;
    }

    const values = form.getValues();
    setTestingProxy(true);
    setProxyTestResult(null);
    try {
      const result = await window.desktopAPI.telegram.testProxyConnection({
        accountId: values.accountId,
        proxyEnabled: values.proxyEnabled,
        proxyUrl: values.proxyUrl.trim() ? values.proxyUrl.trim() : undefined,
      });
      setProxyTestResult(result);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('[agent-module/telegram-section] proxy test failed', error);
      const message =
        error instanceof Error ? error.message : 'Failed to test Telegram proxy connection';
      setProxyTestResult({
        ok: false,
        message,
        elapsedMs: 0,
      });
      toast.error(message);
    } finally {
      setTestingProxy(false);
    }
  }, [form]);

  const runPairingAction = useCallback(
    async (requestId: string, action: 'approve' | 'deny') => {
      if (!window.desktopAPI?.telegram) {
        return;
      }

      setPairingPending((prev) => ({ ...prev, [requestId]: action }));
      try {
        if (action === 'approve') {
          await window.desktopAPI.telegram.approvePairingRequest({ requestId });
          toast.success('Pairing request approved');
        } else {
          await window.desktopAPI.telegram.denyPairingRequest({ requestId });
          toast.success('Pairing request denied');
        }
        await refreshPairingRequests();
      } catch (error) {
        console.error('[agent-module/telegram-section] pairing action failed', {
          requestId,
          action,
          error,
        });
        toast.error(error instanceof Error ? error.message : 'Failed to update pairing request');
      } finally {
        setPairingPending((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
      }
    },
    [refreshPairingRequests]
  );

  const handleApprove = useCallback(
    async (requestId: string) => {
      await runPairingAction(requestId, 'approve');
    },
    [runPairingAction]
  );

  const handleDeny = useCallback(
    async (requestId: string) => {
      await runPairingAction(requestId, 'deny');
    },
    [runPairingAction]
  );

  const effectiveStatus = useMemo(() => statusLabel(status), [status]);

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        <Loader className="mr-2 size-4 animate-spin" />
        Loading Telegram settings...
      </div>
    );
  }

  if (!window.desktopAPI?.telegram || !account) {
    return (
      <p className="text-sm text-muted-foreground">
        Telegram channel API is unavailable in this environment.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Telegram Bot API</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect one bot now. The runtime model already supports multiple accounts.
            </p>
          </div>
          <Badge variant={effectiveStatus.tone}>{effectiveStatus.text}</Badge>
        </div>
        {status?.lastError && <p className="mt-2 text-xs text-destructive">{status.lastError}</p>}
      </div>

      {!secureStorageAvailable && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Secure credential storage is unavailable. Telegram token/webhook secret/proxy URL cannot
          be persisted.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 rounded-xl bg-background p-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
                  <div>
                    <FormLabel>Enable Channel</FormLabel>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Turn Telegram inbound/outbound runtime on or off.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="botToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bot Token</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="123456:AA..."
                      autoComplete="off"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {account.hasBotToken
                      ? 'Token already saved in keychain. Leave empty to keep unchanged.'
                      : 'Token is required to start runtime.'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadSnapshot()}>
                <RefreshCw className="mr-1.5 size-3.5" />
                Refresh
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader className="mr-1.5 size-3.5 animate-spin" />}
                Save Telegram
              </Button>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl bg-background p-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="proxyEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
                  <div>
                    <FormLabel>Enable Proxy</FormLabel>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Route Telegram API traffic through your proxy endpoint.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proxyUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proxy URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="http://127.0.0.1:6152"
                      autoComplete="off"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {account.hasProxyUrl
                      ? 'Proxy URL already saved in keychain. Leave empty to keep unchanged.'
                      : 'Supports http/https/socks5 proxy URL.'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleTestProxy()}
                disabled={testingProxy}
              >
                {testingProxy && <Loader className="mr-1.5 size-3.5 animate-spin" />}
                Test Proxy
              </Button>
              {proxyTestResult && (
                <p
                  className={`text-xs ${proxyTestResult.ok ? 'text-emerald-600' : 'text-destructive'}`}
                >
                  {proxyTestResult.message}
                </p>
              )}
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                Advanced
                <ChevronDown
                  className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4 rounded-xl bg-background p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="webhookSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="secret" autoComplete="off" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {account.hasWebhookSecret
                          ? 'Webhook secret already saved in keychain. Leave empty to keep unchanged.'
                          : 'Required when mode = webhook.'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookListenHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Listen Host</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="127.0.0.1" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Default is 127.0.0.1 for minimum exposure.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookListenPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Listen Port</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} max={65535} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Default 8787. Public webhook URL and local listen port are decoupled.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dmPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DM Policy</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pairing">pairing</SelectItem>
                          <SelectItem value="allowlist">allowlist</SelectItem>
                          <SelectItem value="open">open</SelectItem>
                          <SelectItem value="disabled">disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Policy</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="allowlist">allowlist</SelectItem>
                          <SelectItem value="open">open</SelectItem>
                          <SelectItem value="disabled">disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowFromText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DM Allowlist (one ID per line)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="123456789" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupAllowFromText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Allowlist (one ID per line)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="123456789" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requireMentionByDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
                      <div>
                        <FormLabel>Require Mention in Groups</FormLabel>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recommended to reduce accidental group triggers.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pollingTimeoutSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Polling Timeout (sec)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={5} max={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pollingIdleDelayMs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Polling Idle Delay (ms)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={100} max={5000} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pollingMaxBatchSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Polling Batch Size</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} max={100} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                  control={form.control}
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

                <FormField
                  control={form.control}
                  name="enableDraftStreaming"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
                      <div>
                        <FormLabel>Enable Draft Streaming (Private Chat)</FormLabel>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Stream intermediate reply drafts before final message delivery.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
            </CollapsibleContent>
          </Collapsible>
        </form>
      </Form>

      <div className="rounded-xl bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Pairing Requests</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Approve or deny pending DM pairing requests.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void refreshPairingRequests()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>

        {pairingRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pairingRequests.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">Sender:</span> {item.senderId}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Code:</span> {item.code}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={Boolean(pairingPending[item.id])}
                    onClick={() => void handleApprove(item.id)}
                  >
                    {pairingPending[item.id] === 'approve' && (
                      <Loader className="mr-1.5 size-3.5 animate-spin" />
                    )}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(pairingPending[item.id])}
                    onClick={() => void handleDeny(item.id)}
                  >
                    {pairingPending[item.id] === 'deny' && (
                      <Loader className="mr-1.5 size-3.5 animate-spin" />
                    )}
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
