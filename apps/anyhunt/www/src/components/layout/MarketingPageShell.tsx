/**
 * [PROPS]: children
 * [POS]: Marketing-like routes shared shell (Header + Footer)
 */

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MarketingPageShellProps {
  children: ReactNode;
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
