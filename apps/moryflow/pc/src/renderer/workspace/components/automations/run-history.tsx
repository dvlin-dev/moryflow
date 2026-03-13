import { Badge } from '@moryflow/ui/components/badge';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import type { AutomationJob, AutomationRunRecord } from '@shared/ipc';

type RunHistoryProps = {
  job: AutomationJob | null;
  runs: AutomationRunRecord[];
};

const formatTime = (timestampMs: number): string => {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMs));
};

export const RunHistory = ({ job, runs }: RunHistoryProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card/60 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Run history</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {job ? `Recent runs for ${job.name}.` : 'Select an automation to inspect recent runs.'}
        </p>
      </div>

      <ScrollArea className="mt-4 min-h-0 flex-1">
        <div className="flex flex-col gap-3">
          {job && runs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No run records yet.
            </div>
          ) : null}

          {!job ? (
            <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              Choose an automation from the list to inspect results.
            </div>
          ) : null}

          {runs.map((run) => (
            <div key={run.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatTime(run.startedAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    Finished {formatTime(run.finishedAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    run.status === 'ok'
                      ? 'default'
                      : run.status === 'error'
                        ? 'destructive'
                        : 'outline'
                  }
                >
                  {run.status}
                </Badge>
              </div>

              {run.warningMessage ? (
                <p className="mt-3 text-sm text-amber-600">{run.warningMessage}</p>
              ) : null}
              {run.errorMessage ? (
                <p className="mt-3 text-sm text-destructive">{run.errorMessage}</p>
              ) : null}
              {run.outputText ? (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap text-foreground">
                  {run.outputText}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
