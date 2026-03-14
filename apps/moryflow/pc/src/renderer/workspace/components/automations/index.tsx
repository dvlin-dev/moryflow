import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { onAutomationStatusChange } from '@/lib/desktop/automations-api';
import { useWorkspaceVault } from '../../context';
import { AutomationDetailView } from './automation-detail-view';
import { AutomationListView } from './automation-list-view';
import { automationsMethods } from './store/automations-methods';
import { useAutomationsStore } from './store/use-automations-store';

type ViewState =
  | { kind: 'list' }
  | { kind: 'create'; version: number }
  | { kind: 'detail'; jobId: string };

export const AutomationsPage = () => {
  const { vault } = useWorkspaceVault();
  const isHydrated = useAutomationsStore((state) => state.isHydrated);
  const isLoading = useAutomationsStore((state) => state.isLoading);
  const isSaving = useAutomationsStore((state) => state.isSaving);
  const errorMessage = useAutomationsStore((state) => state.errorMessage);
  const automations = useAutomationsStore((state) => state.automations);
  const knownChats = useAutomationsStore((state) => state.knownChats);
  const runsByJobId = useAutomationsStore((state) => state.runsByJobId);

  const [view, setView] = useState<ViewState>({ kind: 'list' });
  const [createVersion, setCreateVersion] = useState(0);

  useEffect(() => {
    void automationsMethods.hydrate();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onAutomationStatusChange(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        void automationsMethods.hydrate();
        timer = null;
      }, 500);
    });
    return () => {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (errorMessage) toast.error(errorMessage);
  }, [errorMessage]);

  const selectedJob = useMemo(() => {
    if (view.kind !== 'detail') return null;
    return automations.find((job) => job.id === view.jobId) ?? null;
  }, [automations, view]);

  const selectedRuns = selectedJob ? (runsByJobId[selectedJob.id] ?? []) : [];

  const createSource = vault?.path
    ? {
        kind: 'automation-context' as const,
        vaultPath: vault.path,
        displayTitle: 'New automation',
      }
    : null;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl px-6 py-6">
        {view.kind === 'list' ? (
          <AutomationListView
            automations={automations}
            isHydrated={isHydrated}
            isLoading={isLoading}
            onSelectJob={(jobId) => {
              automationsMethods.selectAutomation(jobId);
              setView({ kind: 'detail', jobId });
            }}
            onCreateNew={() => {
              setCreateVersion((v) => v + 1);
              setView({ kind: 'create', version: createVersion + 1 });
            }}
          />
        ) : view.kind === 'create' ? (
          <AutomationDetailView
            key={`create-${view.version}`}
            mode="create"
            job={null}
            runs={[]}
            knownChats={knownChats}
            vaultPath={vault?.path ?? null}
            createSource={createSource}
            isSaving={isSaving}
            onBack={() => setView({ kind: 'list' })}
            onCreated={(created) => {
              automationsMethods.selectAutomation(created.id);
              setView({ kind: 'detail', jobId: created.id });
            }}
          />
        ) : (
          <AutomationDetailView
            key={view.jobId}
            mode="edit"
            job={selectedJob}
            runs={selectedRuns}
            knownChats={knownChats}
            vaultPath={vault?.path ?? null}
            createSource={null}
            isSaving={isSaving}
            onBack={() => setView({ kind: 'list' })}
            onCreated={() => undefined}
          />
        )}
      </div>
    </ScrollArea>
  );
};
