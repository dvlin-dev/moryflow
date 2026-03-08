/**
 * [PROPS]: { title, faqs }
 * [EMITS]: 无
 * [POS]: 可复用 FAQ 手风琴 section
 */

import { ChevronRight } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title: string;
  faqs: FaqItem[];
  /** Optional: use bg-mory-paper background */
  withBackground?: boolean;
}

export function FaqSection({ title, faqs, withBackground = true }: FaqSectionProps) {
  return (
    <section className={`px-4 sm:px-6 py-16 ${withBackground ? 'bg-mory-paper' : ''}`}>
      <div className="container mx-auto max-w-3xl">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-mory-text-primary text-center mb-12">
          {title}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group bg-white rounded-xl border border-mory-border"
            >
              <summary className="flex items-center justify-between cursor-pointer p-5 text-mory-text-primary font-medium">
                {faq.question}
                <ChevronRight
                  size={18}
                  className="text-mory-text-tertiary transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="px-5 pb-5 text-sm text-mory-text-secondary leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
