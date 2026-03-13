import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Badge } from '@moryflow/ui/components/badge';
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
import type { AutomationCreateInput, AutomationEndpoint, AutomationJob } from '@shared/ipc';
import {
  AUTOMATION_PERMISSION_PRESET,
  automationFormSchema,
  createAutomationFormDefaults,
  DEFAULT_CONTEXT_DEPTH,
  toAutomationFormValues,
  type AutomationFormValues,
} from './forms/automation-form-schema';

type AutomationEditorProps = {
  mode: 'create' | 'edit';
  createSource: AutomationCreateInput['source'] | null;
  vaultPath: string | null;
  initialMessage?: string;
  job: AutomationJob | null;
  endpoints: AutomationEndpoint[];
  defaultEndpointId: string | null;
  isSaving: boolean;
  onSaveCreate: (input: AutomationCreateInput) => Promise<void>;
  onSaveUpdate: (job: AutomationJob) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
  onToggle: (jobId: string, enabled: boolean) => Promise<void>;
  onRunNow: (jobId: string) => Promise<void>;
};

const verifiedEndpoints = (endpoints: AutomationEndpoint[]) =>
  endpoints.filter((endpoint) => Boolean(endpoint.verifiedAt));

const toThinking = (values: AutomationFormValues) => {
  if (values.thinkingMode === 'off') {
    return { mode: 'off' as const };
  }
  return {
    mode: 'level' as const,
    level: values.thinkingLevel!.trim(),
  };
};

const toDelivery = (values: AutomationFormValues) =>
  values.deliveryMode === 'push'
    ? {
        mode: 'push' as const,
        endpointId: values.endpointId!.trim(),
      }
    : {
        mode: 'none' as const,
      };

const toSchedule = (values: AutomationFormValues) =>
  values.scheduleKind === 'at'
    ? {
        kind: 'at' as const,
        runAt: Date.parse(values.runAt!),
      }
    : {
        kind: 'every' as const,
        intervalMs: values.intervalHours * 3_600_000,
      };

export const AutomationEditor = ({
  mode,
  createSource,
  vaultPath,
  initialMessage,
  job,
  endpoints,
  defaultEndpointId,
  isSaving,
  onSaveCreate,
  onSaveUpdate,
  onDelete,
  onToggle,
  onRunNow,
}: AutomationEditorProps) => {
  const verified = useMemo(() => verifiedEndpoints(endpoints), [endpoints]);
  const form = useForm<AutomationFormValues>({
    resolver: zodResolver(automationFormSchema) as any,
    defaultValues: createAutomationFormDefaults({
      endpoints: verified,
      defaultEndpointId,
      initialMessage,
      initialName: job?.name,
    }),
  });

  useEffect(() => {
    form.reset(
      job
        ? toAutomationFormValues(job)
        : createAutomationFormDefaults({
            endpoints: verified,
            defaultEndpointId,
            initialMessage,
          })
    );
  }, [defaultEndpointId, form, initialMessage, job, verified]);

  const deliveryMode = form.watch('deliveryMode');
  const scheduleKind = form.watch('scheduleKind');
  const thinkingMode = form.watch('thinkingMode');
  const disabledBecauseNoVault = !vaultPath;
  const disabledBecauseNoSource = mode === 'create' && !createSource;

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!vaultPath) {
      return;
    }
    if (job) {
      await onSaveUpdate({
        ...job,
        name: values.name.trim(),
        enabled: values.enabled,
        schedule: toSchedule(values),
        payload: {
          kind: 'agent-turn',
          message: values.message.trim(),
          modelId: values.modelId?.trim() || undefined,
          thinking: toThinking(values),
          contextDepth: DEFAULT_CONTEXT_DEPTH,
        },
        delivery: toDelivery(values),
        executionPolicy: AUTOMATION_PERMISSION_PRESET,
      });
      return;
    }

    if (!createSource) {
      return;
    }

    await onSaveCreate({
      name: values.name.trim(),
      enabled: values.enabled,
      source: {
        ...createSource,
        displayTitle: values.name.trim(),
      },
      schedule: toSchedule(values),
      payload: {
        kind: 'agent-turn',
        message: values.message.trim(),
        modelId: values.modelId?.trim() || undefined,
        thinking: toThinking(values),
        contextDepth: DEFAULT_CONTEXT_DEPTH,
      },
      delivery: toDelivery(values),
      executionPolicy: AUTOMATION_PERMISSION_PRESET,
    });
  });

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {mode === 'create' ? 'New automation' : 'Automation settings'}
            </h2>
            <Badge variant="secondary">{mode === 'create' ? 'Draft' : 'Live'}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Automations run locally on this PC with unattended approval turned on.
          </p>
        </div>
        {job ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onRunNow(job.id);
              }}
              disabled={isSaving}
            >
              Run now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onToggle(job.id, !job.enabled);
              }}
              disabled={isSaving}
            >
              {job.enabled ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                void onDelete(job.id);
              }}
              disabled={isSaving}
            >
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Unattended execution policy</p>
        <p className="mt-1">
          This automation can read and edit vault files, but network access is denied by default.
        </p>
      </div>

      <Form {...form}>
        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Daily summary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                  <div>
                    <FormLabel>Enabled</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Turn off to keep this automation without scheduling runs.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control as any}
              name="scheduleKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule</FormLabel>
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

          <FormField
            control={form.control as any}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What to run</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={7}
                    placeholder="Summarize the latest project updates and suggest the next action."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 md:grid-cols-2">
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
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground">
                  Uses the workspace default thinking setting.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              name="endpointId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={deliveryMode !== 'push' || verified.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            verified.length === 0
                              ? 'Bind a verified Telegram target first'
                              : 'Choose endpoint'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {verified.map((endpoint) => (
                        <SelectItem key={endpoint.id} value={endpoint.id}>
                          {endpoint.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control as any}
            name="confirmUnattendedExecution"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <FormLabel>Confirm unattended execution</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    This automation will run without interactive approval prompts.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              {disabledBecauseNoVault
                ? 'Choose a workspace before creating automations.'
                : disabledBecauseNoSource
                  ? 'Open a conversation before creating an automation here.'
                  : `Context depth is fixed to the most recent ${DEFAULT_CONTEXT_DEPTH} turns.`}
            </p>
            <Button
              type="submit"
              disabled={isSaving || disabledBecauseNoVault || disabledBecauseNoSource}
            >
              {mode === 'create' ? 'Create automation' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
