import { Globe } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@moryflow/ui/components/empty';
import type { SiteEmptyStateProps } from './const';

export function SiteEmptyState({ onPublishClick }: SiteEmptyStateProps) {
  return (
    <Empty className="py-16" data-testid="sites-empty-state">
      <EmptyMedia variant="icon">
        <Globe />
      </EmptyMedia>
      <EmptyTitle>No sites yet</EmptyTitle>
      <EmptyDescription>Publish any page to the web and manage it here.</EmptyDescription>
      <Button onClick={onPublishClick} className="mt-4">
        Publish a page
      </Button>
    </Empty>
  );
}
