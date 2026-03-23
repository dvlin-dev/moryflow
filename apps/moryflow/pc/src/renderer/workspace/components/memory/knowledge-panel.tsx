import type { ReactNode } from 'react';
import { ArrowLeft, Check, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@moryflow/ui/components/sheet';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { useTranslation } from '@/lib/i18n';
import type { MemoryKnowledgeStatusItem, MemoryOverview } from '@shared/ipc';
import { relativeTime } from './helpers';
import { deriveKnowledgeSummary } from './knowledge-status';

interface KnowledgePanelProps {
  open: boolean;
  onClose: () => void;
  overview: MemoryOverview | null;
  loading: boolean;
  readyItems: MemoryKnowledgeStatusItem[];
  readyError: string | null;
  attentionItems: MemoryKnowledgeStatusItem[];
  attentionError: string | null;
  indexingItems: MemoryKnowledgeStatusItem[];
  indexingError: string | null;
  statusesLoading: boolean;
}

export function KnowledgePanel({
  open,
  onClose,
  overview,
  loading,
  readyItems,
  readyError,
  attentionItems,
  attentionError,
  indexingItems,
  indexingError,
  statusesLoading,
}: KnowledgePanelProps) {
  const { t } = useTranslation('workspace');
  const summary = deriveKnowledgeSummary({
    overview,
    loading,
    attentionItems,
    indexingItems,
  });

  const summaryMessage =
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

  const attentionLoading =
    statusesLoading && attentionItems.length === 0 && summary.attentionSourceCount > 0;
  const indexingLoading =
    statusesLoading && indexingItems.length === 0 && summary.indexingSourceCount > 0;
  const readyLoading = statusesLoading && readyItems.length === 0 && summary.indexedSourceCount > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-[60vw] p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('knowledgeBack')}
              className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{t('knowledgeTitle')}</h2>
          </div>

          <div className="border-b border-border/60 px-4 py-3">
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{summaryMessage.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{summaryMessage.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{summaryMessage.detail}</p>
                    </div>
                    {summary.lastIndexedAt && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t('knowledgeLastIndexed', { time: relativeTime(summary.lastIndexedAt) })}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      {t('knowledgeFilesIndexedStatus', {
                        indexed: summary.indexedSourceCount,
                        total: summary.sourceCount,
                      })}
                    </span>
                    <span>{t('knowledgeInsightsExtracted', { count: summary.derivedCount })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 p-4">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('knowledgeFilesTitle')}
                </h3>
                {readyLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-3 text-xs text-muted-foreground shadow-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t('knowledgeStatusLoadingList')}</span>
                  </div>
                ) : readyItems.length > 0 ? (
                  <div className="space-y-2">
                    {readyError ? <KnowledgeSectionError message={readyError} /> : null}
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
                      <ScrollArea className="max-h-72">
                        <div className="flex flex-col divide-y divide-border/60">
                          {readyItems.map((item) => (
                            <KnowledgeReadyRow key={item.documentId} item={item} />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : readyError ? (
                  <KnowledgeSectionError message={readyError} />
                ) : readyItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('knowledgeNoSearchableFiles')}</p>
                ) : null}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('knowledgeAttentionTitle')}
                </h3>
                {attentionLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-3 text-xs text-muted-foreground shadow-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t('knowledgeStatusLoadingList')}</span>
                  </div>
                ) : attentionItems.length > 0 ? (
                  <div className="space-y-2">
                    {attentionError ? <KnowledgeSectionError message={attentionError} /> : null}
                    <div className="flex flex-col gap-2">
                      {attentionItems.map((item) => (
                        <KnowledgeStatusRow
                          key={item.documentId}
                          item={item}
                          icon={<AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />}
                          fallbackReason={t('knowledgeAttentionReasonFallback')}
                        />
                      ))}
                    </div>
                  </div>
                ) : attentionError ? (
                  <KnowledgeSectionError message={attentionError} />
                ) : attentionItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('knowledgeAttentionEmpty')}</p>
                ) : null}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('knowledgeIndexingSectionTitle')}
                </h3>
                {indexingLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-3 text-xs text-muted-foreground shadow-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t('knowledgeStatusLoadingList')}</span>
                  </div>
                ) : indexingItems.length > 0 ? (
                  <div className="space-y-2">
                    {indexingError ? <KnowledgeSectionError message={indexingError} /> : null}
                    <div className="flex flex-col gap-2">
                      {indexingItems.map((item) => (
                        <KnowledgeStatusRow
                          key={item.documentId}
                          item={item}
                          icon={
                            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground" />
                          }
                          fallbackReason={t('knowledgeIndexingReasonFallback')}
                        />
                      ))}
                    </div>
                  </div>
                ) : indexingError ? (
                  <KnowledgeSectionError message={indexingError} />
                ) : indexingItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('knowledgeIndexingEmpty')}</p>
                ) : null}
              </section>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KnowledgeSectionError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-3 text-xs text-warning shadow-xs">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function KnowledgeReadyRow({ item }: { item: MemoryKnowledgeStatusItem }) {
  return (
    <div className="px-3 py-3">
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
          {item.path && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{item.path}</span>
            </div>
          )}
        </div>
        {item.lastAttemptAt && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeTime(item.lastAttemptAt)}
          </span>
        )}
      </div>
    </div>
  );
}

interface KnowledgeStatusRowProps {
  item: MemoryKnowledgeStatusItem;
  icon: ReactNode;
  fallbackReason: string;
}

function KnowledgeStatusRow({ item, icon, fallbackReason }: KnowledgeStatusRowProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 shadow-xs">
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
          {item.path && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{item.path}</span>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {item.userFacingReason || fallbackReason}
          </p>
        </div>
      </div>
    </div>
  );
}
