import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@moryflow/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@moryflow/ui/components/form';
import { Input } from '@moryflow/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui/components/select';
import { Switch } from '@moryflow/ui/components/switch';
import { Textarea } from '@moryflow/ui/components/textarea';
import type { AutomationCreateInput, AutomationJob, TelegramKnownChat } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import {
  AUTOMATION_PERMISSION_PRESET,
  automationFormSchema,
  createAutomationFormDefaults,
  DEFAULT_CONTEXT_DEPTH,
  parseChatKey,
  toChatKey,
  toAutomationFormValues,
  type AutomationFormValues,
} from './forms/automation-form-schema';

export type AutomationFormProps = {
  mode: 'create' | 'edit';
  job: AutomationJob | null;
  createSource: AutomationCreateInput['source'] | null;
  vaultPath: string | null;
  knownChats: TelegramKnownChat[];
  initialMessage?: string;
  isSaving: boolean;
  onSubmitCreate: (input: AutomationCreateInput) => Promise<void>;
  onSubmitUpdate: (job: AutomationJob) => Promise<void>;
};

const toThinking = (values: AutomationFormValues) =>
  values.thinkingMode === 'off'
    ? { mode: 'off' as const }
    : { mode: 'level' as const, level: values.thinkingLevel!.trim() };

const toDelivery = (values: AutomationFormValues, knownChats: TelegramKnownChat[]) => {
  if (values.deliveryMode !== 'push' || !values.deliveryChatKey) {
    return { mode: 'none' as const };
  }
  const parsed = parseChatKey(values.deliveryChatKey);
  const chat = knownChats.find(
    (c) =>
      c.accountId === parsed.accountId &&
      c.chatId === parsed.chatId &&
      (c.threadId ?? '') === (parsed.threadId ?? '')
  );
  const displayName = chat?.title || chat?.username || parsed.chatId;
  return {
    mode: 'push' as const,
    target: {
      channel: 'telegram' as const,
      accountId: parsed.accountId,
      chatId: parsed.chatId,
      threadId: parsed.threadId,
      label: displayName,
    },
  };
};

const toSchedule = (values: AutomationFormValues) =>
  values.scheduleKind === 'at'
    ? { kind: 'at' as const, runAt: Date.parse(values.runAt!) }
    : { kind: 'every' as const, intervalMs: values.intervalHours * 3_600_000 };

export const AutomationForm = ({
  mode,
  job,
  createSource,
  vaultPath,
  knownChats,
  initialMessage,
  isSaving,
  onSubmitCreate,
  onSubmitUpdate,
}: AutomationFormProps) => {
  const { t } = useTranslation('workspace');
  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema) as any,
    defaultValues: createAutomationFormDefaults({
      knownChats,
      initialMessage,
      initialName: job?.name,
    }),
  });

  useEffect(() => {
    if (mode === 'create' || !job) return;
    form.reset(toAutomationFormValues(job));
  }, [form, job, mode]);

  const deliveryMode = form.watch('deliveryMode');
  const scheduleKind = form.watch('scheduleKind');
  const thinkingMode = form.watch('thinkingMode');
  const disabledNoVault = !vaultPath;
  const disabledNoSource = mode === 'create' && !createSource;

  const chatOptions = useMemo(
    () =>
      knownChats.map((chat) => {
        const displayName = chat.title || chat.username || chat.chatId;
        return {
          key: toChatKey(chat.accountId, chat.chatId, chat.threadId),
          label: chat.threadId ? `${displayName} / ${chat.threadId}` : displayName,
        };
      }),
    [knownChats]
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!vaultPath) return;

    if (mode === 'edit' && job) {
      await onSubmitUpdate({
        ...job,
        name: values.name.trim(),
        enabled: values.enabled,
        schedule: toSchedule(values),
        payload: {
          kind: 'agent-turn',
          message: values.message.trim(),
          modelId: values.modelId?.trim() || undefined,
          thinking: toThinking(values),
          contextDepth: job.payload.contextDepth,
        },
        delivery: toDelivery(values, knownChats),
        executionPolicy: job.executionPolicy,
      });
      return;
    }

    if (!createSource) return;
    await onSubmitCreate({
      name: values.name.trim(),
      enabled: values.enabled,
      source: { ...createSource, displayTitle: values.name.trim() },
      schedule: toSchedule(values),
      payload: {
        kind: 'agent-turn',
        message: values.message.trim(),
        modelId: values.modelId?.trim() || undefined,
        thinking: toThinking(values),
        contextDepth: DEFAULT_CONTEXT_DEPTH,
      },
      delivery: toDelivery(values, knownChats),
      executionPolicy: AUTOMATION_PERMISSION_PRESET,
    });
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* ── Basic ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control as any}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('automationsFormName')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus={mode === 'create'}
                    placeholder={t('automationsFormNamePlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as any}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                <div>
                  <FormLabel>{t('automationsFormEnabled')}</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t('automationsFormEnabledDescription')}
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* ── Schedule ── */}
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('automationsFormSchedule')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="scheduleKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automationsFormType')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="every">{t('automationsFormEveryNHours')}</SelectItem>
                      <SelectItem value="at">{t('automationsFormOneTime')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {scheduleKind === 'every' ? (
              <FormField
                control={form.control as any}
                name="intervalHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automationsFormIntervalHours')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} max={24 * 14} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control as any}
                name="runAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automationsFormRunAt')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* ── Prompt ── */}
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('automationsFormPrompt')}
          </p>
          <FormField
            control={form.control as any}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('automationsFormWhatToRun')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={5}
                    placeholder={t('automationsFormPromptPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Delivery ── */}
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('automationsFormDelivery')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="deliveryMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automationsFormPushResult')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="push">{t('automationsFormSendToTelegram')}</SelectItem>
                      <SelectItem value="none">{t('automationsFormKeepLocalOnly')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="deliveryChatKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automationsFormDestination')}</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={deliveryMode !== 'push' || chatOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            chatOptions.length === 0
                              ? t('automationsFormNoTelegramChats')
                              : t('automationsFormChooseChat')
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chatOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {deliveryMode === 'push' && chatOptions.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('automationsFormConfigureTelegram')}
            </p>
          ) : null}
        </div>

        {/* ── Advanced ── */}
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('automationsFormAdvanced')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('automationsFormModelOverride')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('automationsFormOptional')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control as any}
                name="thinkingMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('automationsFormThinking')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="off">{t('automationsFormThinkingOff')}</SelectItem>
                        <SelectItem value="level">
                          {t('automationsFormThinkingSetLevel')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {thinkingMode === 'level' ? (
                <FormField
                  control={form.control as any}
                  name="thinkingLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('automationsFormLevel')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('automationsFormLevelPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Confirmation (create only) ── */}
        {mode === 'create' ? (
          <FormField
            control={form.control as any}
            name="confirmUnattendedExecution"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                <div>
                  <FormLabel>{t('automationsFormConfirmUnattended')}</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t('automationsFormConfirmDescription')}
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {/* ── Submit ── */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground">
            {disabledNoVault
              ? t('automationsFormChooseWorkspace')
              : disabledNoSource
                ? t('automationsFormOpenConversation')
                : t('automationsFormSecurityNote')}
          </p>
          <Button type="submit" disabled={isSaving || disabledNoVault || disabledNoSource}>
            {mode === 'create'
              ? t('automationsFormCreateAutomation')
              : t('automationsFormSaveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
