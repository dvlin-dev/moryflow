import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { cn } from '@moryflow/ui';
import { DEVELOPER_PRODUCTS, DEVELOPER_RESOURCES } from '@/lib/navigation';
import { MobileHeaderAuthActions } from './auth-actions';
import { MobileMenuItemLink } from './menu-items';
import type { HeaderAuthViewState } from './types';

interface MobileNavigationProps {
  mobileMenuOpen: boolean;
  mobileDevOpen: boolean;
  authViewState: HeaderAuthViewState;
  onCloseMenu: () => void;
  onToggleDeveloperSection: () => void;
  onSignIn: () => void;
  onRegister: () => void;
}

export function MobileNavigation({
  mobileMenuOpen,
  mobileDevOpen,
  authViewState,
  onCloseMenu,
  onToggleDeveloperSection,
  onSignIn,
  onRegister,
}: MobileNavigationProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200 md:hidden',
        mobileMenuOpen ? 'max-h-[500px] pb-4' : 'max-h-0'
      )}
    >
      <nav className="flex flex-col gap-1 pt-2">
        <Link
          to="/"
          className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          onClick={onCloseMenu}
        >
          Digest
        </Link>
        <Link
          to="/developer"
          className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          onClick={onCloseMenu}
        >
          Developer
        </Link>
        <Link
          to="/pricing"
          className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          onClick={onCloseMenu}
        >
          Pricing
        </Link>

        <div>
          <button
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            onClick={onToggleDeveloperSection}
          >
            Developers
            <ChevronDown className={cn('h-4 w-4 transition-transform', mobileDevOpen && 'rotate-180')} />
          </button>
          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              mobileDevOpen ? 'max-h-[400px]' : 'max-h-0'
            )}
          >
            <div className="space-y-1 pl-3 pt-1">
              <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Products
              </div>
              {DEVELOPER_PRODUCTS.map((item) => (
                <MobileMenuItemLink key={item.title} item={item} onSelect={onCloseMenu} />
              ))}

              <div className="mt-2 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Resources
              </div>
              {DEVELOPER_RESOURCES.map((item) => (
                <MobileMenuItemLink key={item.title} item={item} onSelect={onCloseMenu} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <MobileHeaderAuthActions
            viewState={authViewState}
            onSignIn={onSignIn}
            onRegister={onRegister}
            onActionCompleted={onCloseMenu}
          />
        </div>
      </nav>
    </div>
  );
}
