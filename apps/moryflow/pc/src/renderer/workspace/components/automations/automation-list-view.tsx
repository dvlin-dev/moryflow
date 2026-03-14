import { Button } from '@moryflow/ui/components/button';
import type { AutomationJob } from '@shared/ipc';
import { AutomationListItem } from './automation-list-item';
import { automationsMethods } from './store/automations-methods';

type AutomationListViewProps = {
  automations: AutomationJob[];
  isHydrated: boolean;
  isLoading: boolean;
  onSelectJob: (jobId: string) => void;
  onCreateNew: () => void;
};

export const AutomationListView = ({
  automations,
  isHydrated,
  isLoading,
  onSelectJob,
  onCreateNew,
}: AutomationListViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled tasks run locally on this PC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void automationsMethods.hydrate()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button size="sm" onClick={onCreateNew}>
            New automation
          </Button>
        </div>
      </div>

      {automations.length === 0 && isHydrated ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No automations yet. Create one to schedule background agent runs.
          </p>
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            New automation
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((job) => (
            <AutomationListItem key={job.id} job={job} onClick={() => onSelectJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
};
