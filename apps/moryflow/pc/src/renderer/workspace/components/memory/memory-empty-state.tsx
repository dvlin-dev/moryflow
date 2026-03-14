import { Brain } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@moryflow/ui/components/empty';
import type { MemoryBindingDisabledReason } from '@shared/ipc';
import { extractMemoryErrorMessage } from './const';

type MemoryEmptyStateProps = {
  disabledReason?: MemoryBindingDisabledReason;
  error?: unknown;
  onRetry?: () => void;
};

const DISABLED_MESSAGES: Record<
  MemoryBindingDisabledReason,
  { title: string; description: string }
> = {
  login_required: {
    title: 'Log in to enable Memory',
    description: 'Memory requires an authenticated workspace to store and retrieve your knowledge.',
  },
  profile_unavailable: {
    title: 'Setting up your workspace...',
    description: 'Your workspace profile is being prepared. Memory will be available shortly.',
  },
  workspace_unavailable: {
    title: 'Open a workspace to start',
    description: 'Memory needs an active workspace to organize your knowledge.',
  },
};

export const MemoryEmptyState = ({ disabledReason, error, onRetry }: MemoryEmptyStateProps) => {
  if (error) {
    return (
      <Empty className="py-16">
        <EmptyMedia variant="icon">
          <Brain />
        </EmptyMedia>
        <EmptyTitle>Memory unavailable</EmptyTitle>
        <EmptyDescription>{extractMemoryErrorMessage(error)}</EmptyDescription>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
            Retry
          </Button>
        ) : null}
      </Empty>
    );
  }

  const message = disabledReason
    ? DISABLED_MESSAGES[disabledReason]
    : { title: 'Memory unavailable', description: 'Something unexpected happened.' };

  return (
    <Empty className="py-16">
      <EmptyMedia variant="icon">
        <Brain />
      </EmptyMedia>
      <EmptyTitle>{message.title}</EmptyTitle>
      <EmptyDescription>{message.description}</EmptyDescription>
    </Empty>
  );
};
