import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import type { AutomationRunRecord } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';

type RunHistorySectionProps = {
  runs: AutomationRunRecord[];
};

const formatTime = (timestampMs: number) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(timestampMs)
  );

const formatDuration = (startedAt: number, finishedAt: number) => {
  const seconds = Math.round((finishedAt - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'ok') return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === 'error') return <XCircle className="size-4 text-destructive" />;
  return <AlertTriangle className="size-4 text-muted-foreground" />;
};

export const RunHistorySection = ({ runs }: RunHistorySectionProps) => {
  const { t } = useTranslation('workspace');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">
        {t('automationsRunHistory')}
        {runs.length > 0 ? ` (${runs.length})` : ''}
      </h3>

      {runs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t('automationsNoRunRecords')}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {runs.map((run) => {
            const expanded = expandedId === run.id;
            const hasDelivery = run.deliveryStatus && run.deliveryStatus !== 'not-requested';
            const deliveryFailed = hasDelivery && run.deliveryStatus !== 'delivered';

            return (
              <div
                key={run.id}
                className={`rounded-lg border ${
                  run.status === 'error' || deliveryFailed
                    ? 'border-destructive/30'
                    : 'border-border/60'
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  onClick={() => setExpandedId(expanded ? null : run.id)}
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <StatusIcon status={run.status} />
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                    <span className="text-foreground">{formatTime(run.startedAt)}</span>
                    <span className="text-muted-foreground">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {hasDelivery ? (
                      <Badge
                        variant={deliveryFailed ? 'destructive' : 'secondary'}
                        className="gap-1"
                      >
                        <Send className="size-3" />
                        {deliveryFailed ? t('automationsPushFailed') : t('automationsPushed')}
                      </Badge>
                    ) : null}
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
                </button>
                {expanded ? (
                  <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
                    {run.warningMessage ? (
                      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        {run.warningMessage}
                      </div>
                    ) : null}
                    {run.deliveryError ? (
                      <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
                        <Send className="mt-0.5 size-3.5 shrink-0" />
                        {run.deliveryError}
                      </div>
                    ) : null}
                    {run.errorMessage ? (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <XCircle className="mt-0.5 size-3.5 shrink-0" />
                        {run.errorMessage}
                      </div>
                    ) : null}
                    {run.outputText ? (
                      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap text-foreground">
                        {run.outputText}
                      </pre>
                    ) : null}
                    {!run.warningMessage &&
                    !run.deliveryError &&
                    !run.errorMessage &&
                    !run.outputText ? (
                      <p className="text-sm text-muted-foreground">{t('automationsNoOutput')}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
