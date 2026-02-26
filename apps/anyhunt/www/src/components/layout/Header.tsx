/**
 * [PROPS]: None
 * [EMITS]: Navigation events (client routing / external links)
 * [POS]: Anyhunt 官网全局顶部导航（桌面/移动 + Developers 菜单 + Auth CTA）
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useAuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/stores/auth-store';
import { Container } from './Container';
import { DesktopHeaderAuthActions } from './header/auth-actions';
import { DesktopNavigation } from './header/desktop-navigation';
import { MobileNavigation } from './header/mobile-navigation';
import type { DesktopDeveloperMenuActions, DesktopDeveloperMenuState } from './header/desktop-navigation';
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

  const clearCloseTimeout = useCallback(() => {
    if (!closeTimeoutRef.current) return;
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const handleDeveloperMouseEnter = useCallback(() => {
    clearCloseTimeout();
    setDeveloperMenuOpen(true);
  }, [clearCloseTimeout]);

  const handleDeveloperMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setDeveloperMenuOpen(false);
    }, 100);
  }, [clearCloseTimeout]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMobileDevOpen(false);
  }, []);

  const closeDeveloperMenu = useCallback(() => {
    setDeveloperMenuOpen(false);
  }, []);

  const toggleDeveloperMenu = useCallback(() => {
    setDeveloperMenuOpen((open) => !open);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((open) => !open);
  }, []);

  const toggleMobileDeveloperSection = useCallback(() => {
    setMobileDevOpen((open) => !open);
  }, []);

  const desktopDeveloperMenuState = useMemo<DesktopDeveloperMenuState>(
    () => ({
      open: developerMenuOpen,
      id: developerMenuId,
      menuRef,
      triggerRef,
    }),
    [developerMenuId, developerMenuOpen]
  );

  const desktopDeveloperMenuActions = useMemo<DesktopDeveloperMenuActions>(
    () => ({
      onOpen: handleDeveloperMouseEnter,
      onClose: handleDeveloperMouseLeave,
      onToggle: toggleDeveloperMenu,
      onSelectItem: closeDeveloperMenu,
    }),
    [closeDeveloperMenu, handleDeveloperMouseEnter, handleDeveloperMouseLeave, toggleDeveloperMenu]
  );

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
  }, [clearCloseTimeout]);

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
  }, [closeMobileMenu, developerMenuOpen, mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/developer" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">ANYHUNT</span>
          </Link>

          <DesktopNavigation
            developerMenu={{
              state: desktopDeveloperMenuState,
              actions: desktopDeveloperMenuActions,
            }}
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
            onClick={toggleMobileMenu}
          >
            <MobileMenuIcon className="h-5 w-5" />
          </button>
        </div>

        <MobileNavigation
          mobileMenuOpen={mobileMenuOpen}
          mobileDevOpen={mobileDevOpen}
          authViewState={authViewState}
          onCloseMenu={closeMobileMenu}
          onToggleDeveloperSection={toggleMobileDeveloperSection}
          onSignIn={() => openAuthModal({ mode: 'login' })}
          onRegister={() => openAuthModal({ mode: 'register' })}
        />
      </Container>
    </header>
  );
}
