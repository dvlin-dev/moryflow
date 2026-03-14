import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import type {
  AutomationCreateInput,
  AutomationJob,
  AutomationRunRecord,
  TelegramKnownChat,
} from '@shared/ipc';
import { AutomationForm } from './automation-form';
import { RunHistorySection } from './run-history-section';
import { automationsMethods } from './store/automations-methods';

type AutomationDetailViewProps = {
  mode: 'create' | 'edit';
  job: AutomationJob | null;
  runs: AutomationRunRecord[];
  knownChats: TelegramKnownChat[];
  vaultPath: string | null;
  createSource: AutomationCreateInput['source'] | null;
  initialMessage?: string;
  isSaving: boolean;
  onBack: () => void;
  onCreated: (job: AutomationJob) => void;
};

export const AutomationDetailView = ({
  mode,
  job,
  runs,
  knownChats,
  vaultPath,
  createSource,
  initialMessage,
  isSaving,
  onBack,
  onCreated,
}: AutomationDetailViewProps) => {
  const title = mode === 'create' ? 'New automation' : (job?.name ?? 'Automation');

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to list
          </button>
          <span className="text-border/60">/</span>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {mode === 'create' ? <Badge variant="secondary">Draft</Badge> : null}
        </div>
        {mode === 'edit' && job ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={async () => {
                try {
                  await automationsMethods.runNow(job.id);
                  toast.success('Automation run completed');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Failed to run automation');
                }
              }}
            >
              Run now
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={async () => {
                try {
                  await automationsMethods.toggleAutomation(job.id, !job.enabled);
                  toast.success(job.enabled ? 'Automation paused' : 'Automation resumed');
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Failed to update automation'
                  );
                }
              }}
            >
              {job.enabled ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isSaving}
              onClick={async () => {
                try {
                  await automationsMethods.deleteAutomation(job.id);
                  toast.success('Automation deleted');
                  onBack();
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Failed to delete automation'
                  );
                }
              }}
            >
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <AutomationForm
        mode={mode}
        job={job}
        createSource={createSource}
        vaultPath={vaultPath}
        knownChats={knownChats}
        initialMessage={initialMessage}
        isSaving={isSaving}
        onSubmitCreate={async (input) => {
          try {
            const created = await automationsMethods.createAutomation(input);
            toast.success('Automation created');
            onCreated(created);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create automation');
          }
        }}
        onSubmitUpdate={async (updatedJob) => {
          try {
            await automationsMethods.updateAutomation(updatedJob);
            toast.success('Automation saved');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save automation');
          }
        }}
      />

      {mode === 'edit' ? <RunHistorySection runs={runs} /> : null}
    </div>
  );
};
