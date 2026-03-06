import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Skeleton } from '@moryflow/ui';
import type { HeaderAuthViewState } from './types';

interface HeaderAuthActionsProps {
  viewState: HeaderAuthViewState;
  onSignIn: () => void;
  onRegister: () => void;
  onActionCompleted?: () => void;
}

function renderDesktopAuthActionsByState({
  viewState,
  onSignIn,
  onRegister,
}: HeaderAuthActionsProps): ReactNode {
  switch (viewState) {
    case 'loading':
      return <Skeleton className="h-9 w-20" />;
    case 'authenticated':
      return (
        <Link to="/">
          <Button size="sm">Open Digest</Button>
        </Link>
      );
    case 'guest':
      return (
        <>
          <Button variant="ghost" size="sm" onClick={onSignIn}>
            Sign In
          </Button>
          <Button size="sm" onClick={onRegister}>
            Get Started
          </Button>
        </>
      );
    default:
      return null;
  }
}

function renderMobileAuthActionsByState({
  viewState,
  onSignIn,
  onRegister,
  onActionCompleted,
}: HeaderAuthActionsProps): ReactNode {
  const handleSignIn = () => {
    onActionCompleted?.();
    onSignIn();
  };

  const handleRegister = () => {
    onActionCompleted?.();
    onRegister();
  };

  switch (viewState) {
    case 'loading':
      return <Skeleton className="h-9 w-full" />;
    case 'authenticated':
      return (
        <Link to="/" onClick={onActionCompleted}>
          <Button className="w-full" size="sm">
            Open Digest
          </Button>
        </Link>
      );
    case 'guest':
      return (
        <>
          <Button variant="outline" className="w-full" size="sm" onClick={handleSignIn}>
            Sign In
          </Button>
          <Button className="w-full" size="sm" onClick={handleRegister}>
            Get Started
          </Button>
        </>
      );
    default:
      return null;
  }
}

export function DesktopHeaderAuthActions(props: HeaderAuthActionsProps) {
  return <>{renderDesktopAuthActionsByState(props)}</>;
}

export function MobileHeaderAuthActions(props: HeaderAuthActionsProps) {
  return <>{renderMobileAuthActionsByState(props)}</>;
}
