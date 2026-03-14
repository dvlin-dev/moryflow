import { Badge } from '@moryflow/ui/components/badge';
import type { AutomationJob } from '@shared/ipc';

type AutomationListItemProps = {
  job: AutomationJob;
  onClick: () => void;
};

const formatNextRun = (nextRunAt?: number) => {
  if (!nextRunAt) return null;
  return `Next ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(nextRunAt))}`;
};

const formatSchedule = (job: AutomationJob) => {
  if (job.schedule.kind === 'at') return 'One time';
  const hours = Math.round(job.schedule.intervalMs / 3_600_000);
  return `Every ${hours}h`;
};

const formatDelivery = (job: AutomationJob) => {
  if (job.delivery.mode !== 'push') return 'Local only';
  return `→ ${job.delivery.target.label}`;
};

export const AutomationListItem = ({ job, onClick }: AutomationListItemProps) => {
  const schedule = formatSchedule(job);
  const status = job.enabled ? (formatNextRun(job.state.nextRunAt) ?? 'Ready') : 'Paused';
  const delivery = formatDelivery(job);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border/60 p-4 text-left transition-colors hover:border-border hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-medium text-foreground">{job.name}</p>
        <Badge variant={job.enabled ? 'default' : 'outline'}>{job.enabled ? 'On' : 'Off'}</Badge>
      </div>
      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{job.payload.message}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{schedule}</span>
        <span aria-hidden>·</span>
        <span>{status}</span>
        <span aria-hidden>·</span>
        <span>{delivery}</span>
      </div>
    </button>
  );
};
