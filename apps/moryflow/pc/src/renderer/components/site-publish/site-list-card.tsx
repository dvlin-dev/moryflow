import {
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  Delete,
  Ellipsis,
  File,
  Globe,
  Power,
} from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Site } from '../../../shared/ipc/site-publish';

type SiteListCardProps = {
  site: Site;
  copiedId: string | null;
  onCopyLink: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
};

export const SiteListCard = ({
  site,
  copiedId,
  onCopyLink,
  onToggleStatus,
  onDelete,
}: SiteListCardProps) => {
  const isOffline = site.status === 'OFFLINE';

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors',
        isOffline && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'size-10 rounded-lg flex items-center justify-center',
          isOffline ? 'bg-muted' : 'bg-primary/10'
        )}
      >
        <Globe className={cn('size-5', isOffline ? 'text-muted-foreground' : 'text-primary')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-medium">{site.title || site.subdomain}</h4>
          {isOffline && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">Offline</span>}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:text-foreground hover:underline"
          >
            {site.url.replace('https://', '')}
          </a>
          <span className="flex items-center gap-1">
            <File className="size-3" />
            {site.pageCount === 1 ? '1 page' : `${site.pageCount} pages`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(site.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCopyLink} className="size-8">
          {copiedId === site.id ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" asChild className="size-8">
          <a href={site.url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleStatus}>
              <Power className="mr-2 size-4" />
              {isOffline ? 'Go online' : 'Take offline'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Delete className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const formatDate = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

