/**
 * [INPUT]  overview: MemoryOverview | null, loading: boolean, attentionItems, onSync
 * [OUTPUT] Self-contained Knowledge Indexing card (no secondary panel)
 * [POS]    Dashboard card — Cursor-style progress + inline attention list
 */
import { Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { useTranslation } from '@/lib/i18n';
import type { MemoryKnowledgeStatusItem, MemoryOverview } from '@shared/ipc';
import { deriveKnowledgeSummary } from './knowledge-status';
import { relativeTime } from './helpers';

interface KnowledgeCardProps {
  overview: MemoryOverview | null;
  loading: boolean;
  attentionItems: MemoryKnowledgeStatusItem[];
  onSync: () => void;
}

export function KnowledgeCard({ overview, loading, attentionItems, onSync }: KnowledgeCardProps) {
  const { t } = useTranslation('workspace');
  const summary = deriveKnowledgeSummary({ overview, loading, attentionItems });

  const percent =
    summary.sourceCount > 0
      ? Math.round((summary.indexedSourceCount / summary.sourceCount) * 100)
      : 0;

  const badge =
    summary.state === 'SCANNING'
      ? {
          className: 'bg-muted text-muted-foreground',
          icon: <Loader2 className="size-2.5 animate-spin" />,
          label: t('knowledgeScanning'),
        }
      : summary.state === 'NEEDS_ATTENTION'
        ? {
            className: 'bg-warning/10 text-warning',
            icon: <AlertCircle className="size-2.5" />,
            label: t(
              summary.attentionSourceCount === 1
                ? 'knowledgeAttentionBadgeOne'
                : 'knowledgeAttentionBadgeOther',
              { count: summary.attentionSourceCount }
            ),
          }
        : summary.state === 'INDEXING'
          ? {
              className: 'bg-primary/10 text-primary',
              icon: <Loader2 className="size-2.5 animate-spin" />,
              label: t('knowledgeIndexingTitle'),
            }
          : {
              className: 'bg-success/10 text-success',
              icon: <Check className="size-2.5" />,
              label: t('knowledgeReady'),
            };

  const progressColor =
    summary.state === 'NEEDS_ATTENTION'
      ? 'bg-warning'
      : summary.state === 'INDEXING'
        ? 'bg-primary'
        : 'bg-success';

  return (
    <div className="rounded-xl border border-border/60 p-4 shadow-xs">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t('knowledgeTitle')}</h2>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${badge.className}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {t('knowledgeDescription')}
      </p>

      {/* Progress */}
      <div className="mb-3">
        <p className="mb-1.5 text-sm font-semibold text-foreground">{percent}%</p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            {t('knowledgeFilesIndexedStatus', {
              indexed: summary.indexedSourceCount,
              total: summary.sourceCount,
            })}
          </span>
          {summary.derivedCount > 0 && (
            <>
              <span>&middot;</span>
              <span>{t('knowledgeInsightsExtracted', { count: summary.derivedCount })}</span>
            </>
          )}
          {summary.lastIndexedAt && (
            <>
              <span>&middot;</span>
              <span>
                {t('knowledgeLastIndexed', { time: relativeTime(summary.lastIndexedAt) })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Attention files inline */}
      {summary.state === 'NEEDS_ATTENTION' && attentionItems.length > 0 && (
        <div className="mb-3 border-t border-border/60 pt-3">
          <div className="flex flex-col gap-0.5">
            {attentionItems.map((item) => (
              <div
                key={item.documentId}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/50"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.userFacingReason || t('knowledgeAttentionReasonFallback')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end border-t border-border/60 pt-3">
        <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs" onClick={onSync}>
          <RefreshCw className="mr-1 size-3" />
          {t('knowledgeSync')}
        </Button>
      </div>
    </div>
  );
}
