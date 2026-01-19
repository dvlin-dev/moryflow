/**
 * [PROPS]: AgentBrowserEmptyStateProps
 * [EMITS]: None
 * [POS]: Agent Browser 模块空状态提示
 */

import { Card, CardContent } from '@anyhunt/ui';

export interface AgentBrowserEmptyStateProps {
  title?: string;
  description?: string;
}

export function AgentBrowserEmptyState({
  title = 'No API key selected',
  description = 'Select an API key to start testing Agent Browser features.',
}: AgentBrowserEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
