import type { RefObject } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@moryflow/ui';
import { DEVELOPER_PRODUCTS, DEVELOPER_RESOURCES } from '@/lib/navigation';
import { DesktopMenuItemLink } from './menu-items';

export interface DesktopDeveloperMenuState {
  open: boolean;
  id: string;
  menuRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export interface DesktopDeveloperMenuActions {
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onSelectItem: () => void;
}

interface DesktopNavigationProps {
  developerMenu: {
    state: DesktopDeveloperMenuState;
    actions: DesktopDeveloperMenuActions;
  };
}

export function DesktopNavigation({ developerMenu }: DesktopNavigationProps) {
  const { state, actions } = developerMenu;

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <Link
        to="/"
        className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Digest
      </Link>
      <Link
        to="/developer"
        className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Developer
      </Link>
      <Link
        to="/pricing"
        className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Pricing
      </Link>

      <div className="relative" onMouseEnter={actions.onOpen} onMouseLeave={actions.onClose}>
        <button
          ref={state.triggerRef}
          onClick={actions.onToggle}
          aria-haspopup="menu"
          aria-expanded={state.open}
          aria-controls={state.id}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              actions.onOpen();
            }
          }}
          className={cn(
            'flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors',
            state.open
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          Developers
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-150', state.open && 'rotate-180')} />
        </button>

        <div
          id={state.id}
          ref={state.menuRef}
          className={cn(
            'absolute left-1/2 top-full mt-2 w-[540px] -translate-x-1/2 origin-top transition-all duration-150',
            state.open
              ? 'pointer-events-auto scale-100 opacity-100'
              : 'pointer-events-none scale-95 opacity-0'
          )}
          onMouseEnter={actions.onOpen}
          onMouseLeave={actions.onClose}
        >
          <div
            role="menu"
            aria-label="Developers"
            className="rounded-xl border border-border bg-background p-6 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Products
                </h3>
                <div className="space-y-1">
                  {DEVELOPER_PRODUCTS.map((item) => (
                    <DesktopMenuItemLink key={item.title} item={item} onSelect={actions.onSelectItem} />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Resources
                </h3>
                <div className="space-y-1">
                  {DEVELOPER_RESOURCES.map((item) => (
                    <DesktopMenuItemLink key={item.title} item={item} onSelect={actions.onSelectItem} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <a
                href="https://console.anyhunt.app"
                className="group flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Get Started</div>
                    <div className="text-xs text-muted-foreground">
                      Free tier available · No credit card required
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
