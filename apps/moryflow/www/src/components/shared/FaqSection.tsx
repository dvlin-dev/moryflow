/**
 * [PROPS]: { title, faqs, withBackground }
 * [EMITS]: None
 * [POS]: Reusable FAQ accordion section
 */

import { ChevronRight } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title: string;
  faqs: FaqItem[];
  withBackground?: boolean;
}

export function FaqSection({ title, faqs, withBackground = true }: FaqSectionProps) {
  return (
    <section
      className={`px-4 sm:px-6 py-16 ${withBackground ? 'bg-card' : ''}`}
      style={withBackground ? { background: 'var(--gradient-section-subtle)' } : undefined}
    >
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-12 tracking-tight">
          {title}
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group bg-card rounded-xl shadow-xs hover:shadow-sm transition-shadow"
            >
              <summary className="flex items-center justify-between cursor-pointer p-5 text-foreground font-medium">
                {faq.question}
                <ChevronRight
                  size={18}
                  className="text-tertiary transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
