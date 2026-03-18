import { Check, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { MemoryOverview } from '@shared/ipc';

type IndexingStatus = 'scanning' | 'indexing' | 'ready' | 'failed';

function deriveStatus(overview: MemoryOverview | null, loading: boolean): IndexingStatus {
  if (!overview || loading) return 'scanning';
  const { pendingSourceCount, failedSourceCount } = overview.indexing;
  if (pendingSourceCount > 0) return 'indexing';
  if (failedSourceCount > 0) return 'failed';
  return 'ready';
}

interface KnowledgeCardProps {
  overview: MemoryOverview | null;
  loading: boolean;
  onOpenDetail: () => void;
}

export function KnowledgeCard({ overview, loading, onOpenDetail }: KnowledgeCardProps) {
  const { t } = useTranslation('workspace');
  const status = deriveStatus(overview, loading);
  const indexing = overview?.indexing;

  const sourceCount = indexing?.sourceCount ?? 0;
  const indexedSourceCount = indexing?.indexedSourceCount ?? 0;
  const pendingSourceCount = indexing?.pendingSourceCount ?? 0;
  const failedSourceCount = indexing?.failedSourceCount ?? 0;

  const percentage = sourceCount > 0 ? Math.round((indexedSourceCount / sourceCount) * 100) : 0;
  const isLargeBatch =
    sourceCount > 0 && indexedSourceCount > 0 && sourceCount / indexedSourceCount > 1.2;

  return (
    <div className="rounded-xl border border-border/60 shadow-xs p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{t('knowledgeTitle')}</h2>
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-2">
        {status === 'scanning' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">{t('knowledgeScanning')}</span>
          </div>
        )}

        {status === 'indexing' && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {isLargeBatch
                  ? t('knowledgeIndexingNewFiles', { count: pendingSourceCount })
                  : t('knowledgeIndexingProgress', {
                      indexed: indexedSourceCount,
                      total: sourceCount,
                    })}
              </span>
              <span className="text-xs text-muted-foreground">{percentage}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </>
        )}

        {status === 'ready' && (
          <div className="flex items-center gap-2">
            <Check className="size-4 text-success" />
            <span className="text-sm text-success">
              {t(sourceCount === 1 ? 'knowledgeFilesIndexedOne' : 'knowledgeFilesIndexedOther', {
                count: sourceCount,
              })}
            </span>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <span className="text-sm text-destructive">
              {t('knowledgeIndexingFailed')} &middot;{' '}
              {t(failedSourceCount === 1 ? 'knowledgeErrorOne' : 'knowledgeErrorOther', {
                count: failedSourceCount,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
