import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { useWorkspaceVault } from '../../context';
import { AutomationEditor } from './automation-editor';
import { EndpointManager } from './endpoint-manager';
import { RunHistory } from './run-history';
import { automationsMethods } from './store/automations-methods';
import { useAutomationsStore } from './store/use-automations-store';

const getStatusLabel = (enabled: boolean, nextRunAt?: number) => {
  if (!enabled) {
    return 'Paused';
  }
  if (!nextRunAt) {
    return 'Ready';
  }
  return `Next ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(nextRunAt))}`;
};

export const AutomationsPage = () => {
  const { vault } = useWorkspaceVault();
  const isHydrated = useAutomationsStore((state) => state.isHydrated);
  const isLoading = useAutomationsStore((state) => state.isLoading);
  const isSaving = useAutomationsStore((state) => state.isSaving);
  const errorMessage = useAutomationsStore((state) => state.errorMessage);
  const automations = useAutomationsStore((state) => state.automations);
  const endpoints = useAutomationsStore((state) => state.endpoints);
  const defaultEndpointId = useAutomationsStore((state) => state.defaultEndpointId);
  const selectedAutomationId = useAutomationsStore((state) => state.selectedAutomationId);
  const runsByJobId = useAutomationsStore((state) => state.runsByJobId);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    void automationsMethods.hydrate();
  }, []);

  useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  const selectedAutomation = useMemo(
    () => automations.find((job) => job.id === selectedAutomationId) ?? null,
    [automations, selectedAutomationId]
  );
  const selectedRuns = selectedAutomation ? (runsByJobId[selectedAutomation.id] ?? []) : [];

  useEffect(() => {
    if (selectedAutomation) {
      setEditorMode('edit');
      return;
    }
    setEditorMode('create');
  }, [selectedAutomation]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">Automations</h1>
              <Badge variant="secondary">Local scheduler</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create automations from this workspace and deliver results to verified Telegram
              targets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void automationsMethods.hydrate();
              }}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                automationsMethods.selectAutomation(null);
                setEditorMode('create');
              }}
            >
              New automation
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <div className="min-h-0 rounded-2xl border border-border/60 bg-card/60">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Automations</p>
              <p className="mt-1 text-xs text-muted-foreground">{automations.length} configured</p>
            </div>
            <ScrollArea className="h-[calc(100%-61px)]">
              <div className="flex flex-col gap-2 p-3">
                {automations.length === 0 && isHydrated ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    No automation yet. Create one to start scheduling background runs.
                  </div>
                ) : null}
                {automations.map((job) => {
                  const selected = job.id === selectedAutomationId;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      className={cn(
                        'rounded-xl border p-3 text-left transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/60 hover:border-border hover:bg-muted/40'
                      )}
                      onClick={() => {
                        automationsMethods.selectAutomation(job.id);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-foreground">{job.name}</p>
                        <Badge variant={job.enabled ? 'default' : 'outline'}>
                          {job.enabled ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {job.payload.message}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {getStatusLabel(job.enabled, job.state.nextRunAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="grid min-h-0 gap-4 lg:grid-rows-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <AutomationEditor
              mode={editorMode}
              createSource={
                editorMode === 'create' && vault?.path
                  ? {
                      kind: 'automation-context',
                      vaultPath: vault.path,
                      displayTitle: 'New automation',
                    }
                  : null
              }
              vaultPath={vault?.path ?? null}
              job={selectedAutomation}
              endpoints={endpoints}
              defaultEndpointId={defaultEndpointId}
              isSaving={isSaving}
              onSaveCreate={async (input) => {
                try {
                  const created = await automationsMethods.createAutomation(input);
                  setEditorMode('edit');
                  automationsMethods.selectAutomation(created.id);
                  toast.success('Automation created');
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Failed to create automation'
                  );
                }
              }}
              onSaveUpdate={async (job) => {
                try {
                  await automationsMethods.updateAutomation(job);
                  toast.success('Automation saved');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to save automation');
                }
              }}
              onDelete={async (jobId) => {
                try {
                  await automationsMethods.deleteAutomation(jobId);
                  setEditorMode('create');
                  toast.success('Automation deleted');
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Failed to delete automation'
                  );
                }
              }}
              onToggle={async (jobId, enabled) => {
                try {
                  await automationsMethods.toggleAutomation(jobId, enabled);
                  toast.success(enabled ? 'Automation resumed' : 'Automation paused');
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Failed to update automation'
                  );
                }
              }}
              onRunNow={async (jobId) => {
                try {
                  await automationsMethods.runNow(jobId);
                  toast.success('Automation run completed');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to run automation');
                }
              }}
            />

            <RunHistory job={selectedAutomation} runs={selectedRuns} />
          </div>

          <EndpointManager
            endpoints={endpoints}
            defaultEndpointId={defaultEndpointId}
            isSaving={isSaving}
            onBind={async (values) => {
              try {
                const endpoint = await automationsMethods.bindEndpoint({
                  channel: 'telegram',
                  accountId: values.accountId.trim(),
                  chatId: values.chatId.trim(),
                  threadId: values.threadId?.trim() || undefined,
                  label: values.label.trim(),
                });
                toast.success(
                  endpoint.verifiedAt
                    ? 'Endpoint verified and saved'
                    : 'Endpoint saved, but verification did not complete'
                );
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to bind endpoint');
              }
            }}
            onRelabel={async (endpointId, label) => {
              try {
                await automationsMethods.updateEndpoint({ endpointId, label });
                toast.success('Endpoint label updated');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to update endpoint');
              }
            }}
            onDelete={async (endpointId) => {
              try {
                await automationsMethods.removeEndpoint(endpointId);
                toast.success('Endpoint deleted');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Failed to delete endpoint');
              }
            }}
            onSetDefault={async (endpointId) => {
              try {
                await automationsMethods.setDefaultEndpoint(endpointId);
                toast.success(endpointId ? 'Default endpoint updated' : 'Default endpoint cleared');
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : 'Failed to update default endpoint'
                );
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
