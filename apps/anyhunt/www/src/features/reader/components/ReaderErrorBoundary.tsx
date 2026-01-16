/**
 * [PROPS]: children, fallback, resetKeys
 * [POS]: Reader 局部错误边界（单栏兜底，避免整页崩溃）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { Component, type ReactNode } from 'react';
import { Button, Icon } from '@anyhunt/ui';
import { RefreshIcon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';

interface ReaderErrorBoundaryProps {
  children: ReactNode;
  resetKeys?: ReadonlyArray<unknown>;
  onReset?: () => void;
  fallback: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface ReaderErrorBoundaryState {
  error: Error | null;
}

export class ReaderErrorBoundary extends Component<
  ReaderErrorBoundaryProps,
  ReaderErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): ReaderErrorBoundaryState {
    return { error };
  }

  state: ReaderErrorBoundaryState = { error: null };

  componentDidUpdate(prevProps: ReaderErrorBoundaryProps) {
    const prevKeys = prevProps.resetKeys ?? [];
    const nextKeys = this.props.resetKeys ?? [];
    if (this.state.error && prevKeys.length === nextKeys.length) {
      for (let i = 0; i < prevKeys.length; i += 1) {
        if (!Object.is(prevKeys[i], nextKeys[i])) {
          this.reset();
          return;
        }
      }
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

interface ReaderPaneErrorStateProps {
  title?: string;
  description?: string;
  onRetry: () => void;
  onBackToDiscover?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function ReaderPaneErrorState({
  title = 'Something went wrong',
  description = 'Try again, or go back to Discover.',
  onRetry,
  onBackToDiscover,
  secondaryAction,
}: ReaderPaneErrorStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <Icon icon={RefreshIcon} className="mr-1 size-4" />
            Retry
          </Button>
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {onBackToDiscover && (
            <Button variant="ghost" size="sm" onClick={onBackToDiscover}>
              <Icon icon={ArrowLeft01Icon} className="mr-1 size-4" />
              Discover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
