/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Telegram 配置页主编排器——组合 Header/BotToken/Proxy/DmAccess/DeveloperSettings 子组件
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@moryflow/ui/components/button';
import { Form } from '@moryflow/ui/components/form';
import { Loader } from 'lucide-react';
import type {
  TelegramAccountSnapshot,
  TelegramPairingRequestItem,
  TelegramProxyTestResult,
  TelegramRuntimeAccountStatus,
} from '@shared/ipc';

import {
  telegramFormSchema,
  toFormValues,
  parseListText,
  statusLabel,
  hasRuntimeStartFailure,
  type FormValues,
} from './telegram-form-schema';
import { TelegramHeader } from './telegram-header';
import { TelegramBotToken } from './telegram-bot-token';
import { TelegramProxy } from './telegram-proxy';
import { TelegramDmAccess } from './telegram-dm-access';
import { TelegramDeveloperSettings } from './telegram-developer-settings';
import { resolveTelegramProxyGuidance } from './telegram-runtime-error-guidance';

export { telegramFormSchema } from './telegram-form-schema';

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
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [secureStorageAvailable, setSecureStorageAvailable] = useState(true);
  const proxyDetectAttemptedRef = useRef<Set<string>>(new Set());

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

  const runAutoProxyDetection = useCallback(
    async (activeAccount: TelegramAccountSnapshot) => {
      if (!window.desktopAPI?.telegram?.detectProxySuggestion) {
        return;
      }
      if (activeAccount.hasProxyUrl) {
        return;
      }

      const accountId = activeAccount.accountId;
      if (proxyDetectAttemptedRef.current.has(accountId)) {
        return;
      }
      proxyDetectAttemptedRef.current.add(accountId);

      try {
        const suggestion = await window.desktopAPI.telegram.detectProxySuggestion({ accountId });
        if (form.getValues('accountId') !== accountId) {
          return;
        }
        if (form.formState.isDirty) {
          return;
        }
        if (form.getValues('hasStoredProxyUrl')) {
          return;
        }

        if (form.getValues('proxyEnabled') !== suggestion.proxyEnabled) {
          form.setValue('proxyEnabled', suggestion.proxyEnabled, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        }

        const suggestedProxyUrl = suggestion.proxyUrl?.trim();
        if (suggestedProxyUrl && form.getValues('proxyUrl').trim() !== suggestedProxyUrl) {
          form.setValue('proxyUrl', suggestedProxyUrl, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        }
      } catch (error) {
        console.warn('[remote-agents/telegram-section] proxy auto-detection failed', error);
      }
    },
    [form]
  );

  // ── snapshot 加载 ──

  const loadSnapshot = useCallback(async () => {
    if (!window.desktopAPI?.telegram) return;

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
      setLastSaveError(null);
      if (activeAccount) {
        form.reset(toFormValues(activeAccount));
        setStatus(runtimeStatus.accounts[activeAccount.accountId] ?? null);
        void runAutoProxyDetection(activeAccount);
        const requests = await window.desktopAPI.telegram.listPairingRequests({
          accountId: activeAccount.accountId,
          status: 'pending',
        });
        setPairingRequests(requests);
      }
    } catch (error) {
      console.error('[remote-agents/telegram-section] failed to load snapshot', error);
      toast.error('Failed to load Telegram settings');
    } finally {
      setLoading(false);
    }
  }, [form, runAutoProxyDetection]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!window.desktopAPI?.telegram) return;
    const dispose = window.desktopAPI.telegram.onStatusChange((next) => {
      const accountId = form.getValues('accountId');
      setStatus(next.accounts[accountId] ?? null);
    });
    return () => dispose();
  }, [form]);

  // ── pairing ──

  const refreshPairingRequests = useCallback(async () => {
    if (!window.desktopAPI?.telegram || !account) return;
    const requests = await window.desktopAPI.telegram.listPairingRequests({
      accountId: account.accountId,
      status: 'pending',
    });
    setPairingRequests(requests);
  }, [account]);

  const runPairingAction = useCallback(
    async (requestId: string, action: 'approve' | 'deny') => {
      if (!window.desktopAPI?.telegram) return;

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
        console.error('[remote-agents/telegram-section] pairing action failed', {
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

  // ── 表单提交 ──

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!window.desktopAPI?.telegram) return;

      setSaving(true);
      try {
        setLastSaveError(null);
        setProxyTestResult(null);
        const normalizedBotToken = values.botToken.trim();
        const normalizedProxyUrl = values.proxyUrl.trim();
        const defaultBotToken = form.formState.defaultValues?.botToken?.trim() ?? '';
        const defaultProxyUrl = form.formState.defaultValues?.proxyUrl?.trim() ?? '';
        const hasBotTokenChanged = normalizedBotToken !== defaultBotToken;
        const hasProxyUrlChanged = normalizedProxyUrl !== defaultProxyUrl;
        const shouldPersistInitialProxyUrl =
          values.proxyEnabled && !values.hasStoredProxyUrl && normalizedProxyUrl.length > 0;

        const botTokenPatch: string | null | undefined = !hasBotTokenChanged
          ? undefined
          : normalizedBotToken
            ? normalizedBotToken
            : values.hasStoredBotToken
              ? null
              : undefined;

        const proxyUrlPatch: string | null | undefined =
          !hasProxyUrlChanged && !shouldPersistInitialProxyUrl
            ? undefined
            : normalizedProxyUrl
              ? normalizedProxyUrl
              : values.hasStoredProxyUrl
                ? null
                : undefined;

        const next = await window.desktopAPI.telegram.updateSettings({
          account: {
            accountId: values.accountId,
            enabled: values.enabled,
            mode: values.mode,
            proxyEnabled: values.proxyEnabled,
            webhookUrl: values.webhookUrl.trim(),
            webhookListenHost: values.webhookListenHost.trim(),
            webhookListenPort: values.webhookListenPort,
            botToken: botTokenPatch,
            webhookSecret: values.webhookSecret.trim() ? values.webhookSecret.trim() : undefined,
            proxyUrl: proxyUrlPatch,
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
        setLastSaveError(null);
        await refreshPairingRequests();
      } catch (error) {
        console.error('[remote-agents/telegram-section] failed to save settings', error);
        const message = error instanceof Error ? error.message : 'Failed to save Telegram settings';
        setLastSaveError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [form, refreshPairingRequests]
  );

  // ── proxy test ──

  const handleTestProxy = useCallback(async () => {
    if (!window.desktopAPI?.telegram) return;

    const isValid = await form.trigger(['proxyEnabled', 'proxyUrl', 'hasStoredProxyUrl']);
    if (!isValid) return;

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
      console.error('[remote-agents/telegram-section] proxy test failed', error);
      const message =
        error instanceof Error ? error.message : 'Failed to test Telegram proxy connection';
      setProxyTestResult({ ok: false, message, elapsedMs: 0 });
      toast.error(message);
    } finally {
      setTestingProxy(false);
    }
  }, [form]);

  // ── 派生状态 ──

  const proxyEnabled = form.watch('proxyEnabled');
  const effectiveStatus = useMemo(() => statusLabel(status), [status]);
  const proxyNetworkGuidance = useMemo(
    () =>
      resolveTelegramProxyGuidance({
        errorMessage: lastSaveError ?? status?.lastError,
        proxyEnabled,
      }),
    [lastSaveError, proxyEnabled, status?.lastError]
  );

  // ── 加载态 / 不可用态 ──

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

  // ── 渲染 ──

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {!secureStorageAvailable && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Secure credential storage is unavailable. Token / webhook secret / proxy URL cannot be
            persisted.
          </div>
        )}

        <div className="space-y-6 rounded-xl bg-background px-5 py-5">
          <TelegramHeader effectiveStatus={effectiveStatus} lastError={status?.lastError} />
          <TelegramBotToken />
          <TelegramProxy
            testingProxy={testingProxy}
            proxyTestResult={proxyTestResult}
            networkGuidance={proxyNetworkGuidance}
            onTestProxy={() => void handleTestProxy()}
          />
          <TelegramDmAccess
            pairingRequests={pairingRequests}
            pairingPending={pairingPending}
            onRefreshPairingRequests={() => void refreshPairingRequests()}
            onApprove={(id) => void handleApprove(id)}
            onDeny={(id) => void handleDeny(id)}
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader className="mr-1.5 size-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>

        <TelegramDeveloperSettings
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          hasWebhookSecret={account.hasWebhookSecret}
        />
      </form>
    </Form>
  );
};
