/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Website top navigation bar with Logo, docs link, and download button
 */

'use client';

import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@aiget/ui';
import { Download01Icon, Book01Icon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/cn';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToDownload = () => {
    const downloadSection = document.getElementById('download');
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-8 py-4',
        isScrolled ? 'pt-4' : 'pt-6'
      )}
    >
      <div
        className={cn(
          'max-w-7xl mx-auto rounded-2xl transition-all duration-300 flex items-center justify-between px-6 py-3',
          isScrolled
            ? 'bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/[0.03]'
            : 'bg-transparent'
        )}
      >
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/logo.svg"
            alt="Moryflow Logo"
            className="w-7 h-7 object-contain transition-transform group-hover:scale-110"
          />
          <span className="font-serif font-bold text-xl tracking-tight text-mory-text-primary group-hover:text-mory-orange transition-colors">
            Moryflow
          </span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="https://docs.moryflow.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-mory-text-secondary hover:text-mory-orange transition-colors p-2 sm:p-0"
            title="Documentation"
          >
            <Icon icon={Book01Icon} size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <button
            onClick={scrollToDownload}
            className="flex items-center gap-1.5 sm:gap-2 bg-mory-text-primary text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Icon icon={Download01Icon} size={16} />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
