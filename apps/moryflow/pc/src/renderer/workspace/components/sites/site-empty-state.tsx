import { Globe } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@moryflow/ui/components/empty';
import { useTranslation } from '@/lib/i18n';
import type { SiteEmptyStateProps } from './const';

export function SiteEmptyState({ onPublishClick }: SiteEmptyStateProps) {
  const { t } = useTranslation('workspace');

  return (
    <Empty className="py-16" data-testid="sites-empty-state">
      <EmptyMedia variant="icon">
        <Globe />
      </EmptyMedia>
      <EmptyTitle>{t('sitesNoSitesYet')}</EmptyTitle>
      <EmptyDescription>{t('sitesEmptyDescription')}</EmptyDescription>
      <Button onClick={onPublishClick} className="mt-4">
        {t('sitesPublishPage')}
      </Button>
    </Empty>
  );
}
