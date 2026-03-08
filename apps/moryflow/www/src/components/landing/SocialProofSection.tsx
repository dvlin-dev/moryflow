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
    <section className="py-16 sm:py-20 px-4 sm:px-6 bg-mory-paper">
      <div className="container mx-auto max-w-3xl text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-mory-orange/10 flex items-center justify-center mb-5">
          <Users size={24} className="text-mory-orange" />
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
