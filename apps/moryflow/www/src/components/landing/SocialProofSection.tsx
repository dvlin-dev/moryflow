/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Social proof section — placeholder for download stats / user quotes (to be populated later)
 */

'use client';

import { Users } from 'lucide-react';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';

export function SocialProofSection() {
  const locale = useLocale();

  return (
    <section className="py-14 sm:py-16 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mory-border bg-mory-paper px-3 py-1 text-xs font-medium text-mory-text-tertiary">
          <Users size={24} className="text-mory-orange" />
          {t('home.socialProof.beta', locale)}
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-mory-text-primary mb-4">
          {t('home.socialProof.title', locale)}
        </h2>
        <p className="text-mory-text-secondary max-w-lg mx-auto">
          {t('home.socialProof.subtitle', locale)}
        </p>
      </div>
    </section>
  );
}
