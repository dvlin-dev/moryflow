/**
 * [DEFINES]: Pricing tiers and FAQ data
 * [USED_BY]: pricing.tsx, PricingSection.tsx
 * [POS]: 定价数据常量 - 统一管理定价方案
 */

export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

export interface PricingFaq {
  question: string;
  answer: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for side projects and testing',
    features: [
      '100 API requests/month',
      'Markdown & HTML output',
      'Basic metadata extraction',
      'Screenshot support',
      'Community support',
    ],
    cta: 'Get Started',
    href: 'https://console.aiget.dev/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams and production apps',
    features: [
      '10,000 API requests/month',
      'All output formats',
      'AI data extraction',
      'Site crawling & mapping',
      'Priority support',
      'Webhooks',
    ],
    cta: 'Start Free Trial',
    href: 'https://console.aiget.dev/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large-scale operations',
    features: [
      'Unlimited requests',
      'Dedicated support',
      'Custom rate limits',
      'Invoice billing',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: 'mailto:hi@aiget.dev?subject=Enterprise%20Inquiry',
    highlighted: false,
  },
];

export const PRICING_FAQS: PricingFaq[] = [
  {
    question: 'How do API requests work?',
    answer:
      'Each API call (scrape, crawl, extract, etc.) counts as one request. Batch operations count as multiple requests based on the number of URLs processed.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer:
      'Yes, you can change your plan at any time. When upgrading, you get immediate access to the new features. When downgrading, the change takes effect at the next billing cycle.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer:
      'We will notify you when you approach your limits. You can either upgrade your plan or purchase additional credits. We never cut off access without warning.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'Yes, we offer a 14-day money-back guarantee for all paid plans. If you are not satisfied, contact us for a full refund.',
  },
];
