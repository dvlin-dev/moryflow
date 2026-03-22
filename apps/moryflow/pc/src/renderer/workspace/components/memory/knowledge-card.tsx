import { Check, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { MemoryOverview } from '@shared/ipc';
import { deriveKnowledgeSummary } from './knowledge-status';

interface KnowledgeCardProps {
  overview: MemoryOverview | null;
  loading: boolean;
  onOpenDetail: () => void;
}

export function KnowledgeCard({ overview, loading, onOpenDetail }: KnowledgeCardProps) {
  const { t } = useTranslation('workspace');
  const summary = deriveKnowledgeSummary({ overview, loading });

  const message =
    summary.state === 'SCANNING'
      ? {
          icon: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
          title: t('knowledgeScanning'),
          detail: t('knowledgeStatusScanningDetail'),
        }
      : summary.state === 'NEEDS_ATTENTION'
        ? {
            icon: <AlertCircle className="size-4 text-warning" />,
            title: t('knowledgeNeedsAttention'),
            detail: t(
              summary.attentionSourceCount === 1
                ? 'knowledgeStatusAttentionDetailOne'
                : 'knowledgeStatusAttentionDetailOther',
              { count: summary.attentionSourceCount }
            ),
          }
        : summary.state === 'INDEXING'
          ? {
              icon: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
              title: t('knowledgeIndexingTitle'),
              detail: t(
                summary.indexingSourceCount === 1
                  ? 'knowledgeStatusIndexingDetailOne'
                  : 'knowledgeStatusIndexingDetailOther',
                { count: summary.indexingSourceCount }
              ),
            }
          : {
              icon: <Check className="size-4 text-success" />,
              title: t('knowledgeReady'),
              detail:
                summary.sourceCount > 0
                  ? t('knowledgeStatusReadyDetail', {
                      indexed: summary.indexedSourceCount,
                      total: summary.sourceCount,
                    })
                  : t('knowledgeNoSearchableFiles'),
            };

  return (
    <div className="rounded-xl border border-border/60 shadow-xs p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t('knowledgeTitle')}</h2>
        <button
          type="button"
          onClick={onOpenDetail}
          aria-label={t('knowledgeOpenDetails')}
          className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{message.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{message.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{message.detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
