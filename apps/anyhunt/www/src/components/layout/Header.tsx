/**
 * [PROPS]: None
 * [EMITS]: Navigation events (client routing / external links)
 * [POS]: Anyhunt 官网全局顶部导航（桌面/移动 + Developers 菜单 + Auth CTA）
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useAuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/stores/auth-store';
import { Container } from './Container';
import { DesktopHeaderAuthActions } from './header/auth-actions';
import { DesktopNavigation } from './header/desktop-navigation';
import { MobileNavigation } from './header/mobile-navigation';
import type { HeaderAuthViewState } from './header/types';

function resolveHeaderAuthViewState(isLoading: boolean, isAuthenticated: boolean): HeaderAuthViewState {
  if (isLoading) {
    return 'loading';
  }

  if (isAuthenticated) {
    return 'authenticated';
  }

  return 'guest';
}

export function Header() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = !isHydrated || !isBootstrapped;
  const authViewState = resolveHeaderAuthViewState(isLoading, isAuthenticated);

  const { openAuthModal } = useAuthModal();

  const [developerMenuOpen, setDeveloperMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDevOpen, setMobileDevOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const developerMenuId = 'developer-mega-menu';
  const MobileMenuIcon = mobileMenuOpen ? X : Menu;

  const clearCloseTimeout = () => {
    if (!closeTimeoutRef.current) return;
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  };

  const handleDeveloperMouseEnter = () => {
    clearCloseTimeout();
    setDeveloperMenuOpen(true);
  };

  const handleDeveloperMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setDeveloperMenuOpen(false);
    }, 100);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileDevOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;

      setDeveloperMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearCloseTimeout();
    };
  }, []);

  useEffect(() => {
    if (!developerMenuOpen && !mobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setDeveloperMenuOpen(false);
      closeMobileMenu();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [developerMenuOpen, mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/developer" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">ANYHUNT</span>
          </Link>

          <DesktopNavigation
            developerMenuOpen={developerMenuOpen}
            developerMenuId={developerMenuId}
            menuRef={menuRef}
            triggerRef={triggerRef}
            onDeveloperMouseEnter={handleDeveloperMouseEnter}
            onDeveloperMouseLeave={handleDeveloperMouseLeave}
            onDeveloperToggle={() => setDeveloperMenuOpen((open) => !open)}
            onDeveloperItemSelect={() => setDeveloperMenuOpen(false)}
          />

          <div className="hidden items-center gap-3 md:flex">
            <DesktopHeaderAuthActions
              viewState={authViewState}
              onSignIn={() => openAuthModal({ mode: 'login' })}
              onRegister={() => openAuthModal({ mode: 'register' })}
            />
          </div>

          <button
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 transition-colors hover:bg-muted md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <MobileMenuIcon className="h-5 w-5" />
          </button>
        </div>

        <MobileNavigation
          mobileMenuOpen={mobileMenuOpen}
          mobileDevOpen={mobileDevOpen}
          authViewState={authViewState}
          onCloseMenu={closeMobileMenu}
          onToggleDeveloperSection={() => setMobileDevOpen((open) => !open)}
          onSignIn={() => openAuthModal({ mode: 'login' })}
          onRegister={() => openAuthModal({ mode: 'register' })}
        />
      </Container>
    </header>
  );
}
