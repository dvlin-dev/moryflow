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
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus={mode === 'create'} placeholder="Daily summary" />
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
                  <FormLabel>Enabled</FormLabel>
                  <p className="text-xs text-muted-foreground">Schedule runs automatically.</p>
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
            Schedule
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="scheduleKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="every">Every N hours</SelectItem>
                      <SelectItem value="at">One time</SelectItem>
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
                    <FormLabel>Interval hours</FormLabel>
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
                    <FormLabel>Run at</FormLabel>
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
            Prompt
          </p>
          <FormField
            control={form.control as any}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What to run</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={5}
                    placeholder="Summarize the latest project updates and suggest the next action."
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
            Delivery
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="deliveryMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Push result</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="push">Send to Telegram</SelectItem>
                      <SelectItem value="none">Keep local only</SelectItem>
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
                  <FormLabel>Destination</FormLabel>
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
                              ? 'No Telegram chats available'
                              : 'Choose a chat'
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
              Configure and pair a Telegram bot in Remote Agents first.
            </p>
          ) : null}
        </div>

        {/* ── Advanced ── */}
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Advanced
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control as any}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model override</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional" />
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
                    <FormLabel>Thinking</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="level">Set level</SelectItem>
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
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="high" />
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
                  <FormLabel>Confirm unattended execution</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    This automation runs without interactive approval prompts.
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
              ? 'Choose a workspace first.'
              : disabledNoSource
                ? 'Open a conversation first.'
                : 'Runs locally with vault-only file access and no network.'}
          </p>
          <Button type="submit" disabled={isSaving || disabledNoVault || disabledNoSource}>
            {mode === 'create' ? 'Create automation' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
