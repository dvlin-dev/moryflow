/**
 * [PROPS]: AgentBrowserEmptyStateProps
 * [EMITS]: None
 * [POS]: Agent Browser 模块空状态提示（可选操作引导）
 */

import type { ReactNode } from 'react';
import { Button, Card, CardContent } from '@anyhunt/ui';

export interface AgentBrowserEmptyStateProps {
  title?: string;
  description?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
}

export function AgentBrowserEmptyState({
  title = 'No API key selected',
  description = 'Select an API key to start testing Agent Browser features.',
  actionLabel,
  actionHref,
}: AgentBrowserEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {actionLabel && actionHref && (
          <Button variant="link" className="mt-3 h-auto px-0" asChild>
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
