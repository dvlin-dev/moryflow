import { ChevronRight, Link } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ConnectionsCardProps {
  entityCount: number;
  relationCount: number;
  onOpenDetail: () => void;
}

export function ConnectionsCard({
  entityCount,
  relationCount,
  onOpenDetail,
}: ConnectionsCardProps) {
  const { t } = useTranslation('workspace');
  if (entityCount <= 0) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 shadow-xs px-4 py-3">
      <div className="flex items-center gap-3">
        <Link className="size-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t('connectionsTitle')}</span>
          <span className="text-xs text-muted-foreground">
            {t(entityCount === 1 ? 'connectionsEntityOne' : 'connectionsEntityOther', {
              count: entityCount,
            })}{' '}
            &middot;{' '}
            {t(relationCount === 1 ? 'connectionsRelationOne' : 'connectionsRelationOther', {
              count: relationCount,
            })}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
