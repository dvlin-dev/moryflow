/**
 * [PROPS]: { site, onClick, onAction }
 * [EMITS]: onClick() - 点击卡片, onAction(action) - 触发操作
 * [POS]: Sites CMS 的站点卡片组件（Lucide 图标）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  ArrowUpRight,
  Copy,
  Delete,
  Globe,
  Ellipsis,
  Power,
  RefreshCw,
  Settings,
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
import type { SiteCardProps, SiteAction } from './const';
import { formatRelativeTime, isSiteOnline } from './const';

export function SiteCard({ site, onClick, onAction }: SiteCardProps) {
  const isOnline = isSiteOnline(site);

  const handleAction = (action: SiteAction, e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(action);
  };

  return (
    <div
      className="group relative cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:border-border-hover hover:shadow-sm"
      onClick={onClick}
    >
      {/* 内容区 */}
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isOnline ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          <Globe className={cn('h-5 w-5', isOnline ? 'text-primary' : 'text-muted-foreground')} />
        </div>

        {/* 信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium">{site.subdomain}</h3>
            {/* 状态指示器 */}
            <span
              className={cn(
                'h-2 w-2 shrink-0 rounded-full',
                isOnline ? 'bg-green-500' : 'bg-muted-foreground'
              )}
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">{site.url}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {site.pageCount} {site.pageCount === 1 ? 'page' : 'pages'} · Updated{' '}
            {formatRelativeTime(site.updatedAt)}
          </p>
        </div>

        {/* 操作菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => handleAction('open', e)}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Open site
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction('copy', e)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => handleAction('settings', e)}>
              <Settings className="mr-2 h-4 w-4" />
              Site settings
            </DropdownMenuItem>
            {isOnline && (
              <DropdownMenuItem onClick={(e) => handleAction('update', e)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isOnline ? (
              <DropdownMenuItem onClick={(e) => handleAction('unpublish', e)}>
                <Power className="mr-2 h-4 w-4" />
                Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={(e) => handleAction('publish', e)}>
                <Power className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => handleAction('delete', e)}
              className="text-destructive focus:text-destructive"
            >
              <Delete className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
