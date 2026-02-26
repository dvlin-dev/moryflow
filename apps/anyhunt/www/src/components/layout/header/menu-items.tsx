import { Link } from '@tanstack/react-router';
import type { HeaderMenuItemProps } from './types';

export function DesktopMenuItemLink({ item, onSelect }: HeaderMenuItemProps) {
  const IconComponent = item.icon;

  const content = (
    <div className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors group-hover:border-primary/50">
        <IconComponent className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground">{item.description}</div>
      </div>
    </div>
  );

  if (item.internal) {
    return (
      <Link to={item.href as '/fetchx' | '/memox'} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onSelect}>
      {content}
    </a>
  );
}

export function MobileMenuItemLink({ item, onSelect }: HeaderMenuItemProps) {
  const IconComponent = item.icon;

  const content = (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted">
      <IconComponent className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{item.title}</span>
    </div>
  );

  if (item.internal) {
    return (
      <Link to={item.href as '/fetchx' | '/memox'} onClick={onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onSelect}>
      {content}
    </a>
  );
}
