/**
 * Welcome Pages Card
 *
 * [PROPS]: viewModel/actions（列表状态 + 选择/排序/删除动作）
 * [POS]: Digest Welcome - Welcome Pages 列表与排序/删除入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@moryflow/ui';
import type { DigestWelcomePage } from '@/features/digest-welcome';
import { resolveWelcomePagesCardState } from './welcome-card-states';

interface WelcomePagesCardProps {
  viewModel: WelcomePagesCardViewModel;
  actions: WelcomePagesCardActions;
}

export interface WelcomePagesCardViewModel {
  isLoading: boolean;
  isError: boolean;
  pages: DigestWelcomePage[];
  selectedPageId: string | null;
  isReordering: boolean;
  isDeleting: boolean;
}

export interface WelcomePagesCardActions {
  onSelect: (id: string) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}

export function WelcomePagesCard({ viewModel, actions }: WelcomePagesCardProps) {
  const { isLoading, isError, pages, selectedPageId, isReordering, isDeleting } = viewModel;
  const { onSelect, onMove, onDelete } = actions;
  const state = resolveWelcomePagesCardState({
    isLoading,
    hasError: isError,
    pageCount: pages.length,
  });

  const renderContentByState = () => {
    switch (state) {
      case 'loading':
        return <Skeleton className="h-24 w-full" />;
      case 'error':
        return <div className="text-sm text-destructive">Failed to load pages.</div>;
      case 'empty':
        return <div className="text-sm text-muted-foreground">No pages yet.</div>;
      case 'ready':
        return (
          <div className="space-y-1">
            {pages.map((page) => {
              const isActive = page.id === selectedPageId;
              const title = page.titleByLocale?.en || page.slug;

              return (
                <button
                  key={page.id}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left',
                    isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40',
                  ].join(' ')}
                  onClick={() => onSelect(page.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="truncate text-xs text-muted-foreground">{page.slug}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={page.enabled ? 'secondary' : 'outline'}>
                      {page.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Pages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderContentByState()}

        <div className="flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onMove('up')}
              disabled={!selectedPageId || isReordering}
            >
              Up
            </Button>
            <Button
              variant="outline"
              onClick={() => onMove('down')}
              disabled={!selectedPageId || isReordering}
            >
              Down
            </Button>
          </div>
          <Button variant="destructive" onClick={onDelete} disabled={!selectedPageId || isDeleting}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
