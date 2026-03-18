/**
 * [PROPS]: { data } - JSON-LD 结构化数据
 * [EMITS]: 无
 * [POS]: SEO JSON-LD 注入组件，支持 Organization / SoftwareApplication / WebPage / FAQPage / Article / BreadcrumbList
 */

interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

interface OfferSchema {
  '@type': 'Offer';
  name?: string;
  price: string;
  priceCurrency: string;
}

interface ProductSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: OfferSchema | OfferSchema[];
}

interface WebPageSchema {
  '@context': 'https://schema.org';
  '@type': 'WebPage';
  name: string;
  description: string;
  url: string;
}

interface FAQPageSchema {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

interface ArticleSchema {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: { '@type': 'Organization'; name: string; url: string };
  publisher: {
    '@type': 'Organization';
    name: string;
    url: string;
    logo: { '@type': 'ImageObject'; url: string };
  };
}

interface BreadcrumbSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }[];
}

type JsonLdData =
  | OrganizationSchema
  | ProductSchema
  | WebPageSchema
  | FAQPageSchema
  | ArticleSchema
  | BreadcrumbSchema;

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

// ─── Pre-built schemas ───

export const organizationSchema: OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Moryflow',
  url: 'https://www.moryflow.com',
  logo: 'https://www.moryflow.com/logo.svg',
  sameAs: ['https://twitter.com/moryflow', 'https://github.com/dvlin-dev/moryflow'],
};

export const productSchema: ProductSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Moryflow',
  description:
    'AI agents that work with your knowledge, notes, and files. Local-first desktop app for macOS.',
  url: 'https://www.moryflow.com',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'macOS',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

// ─── Schema factories ───

export function createWebPageSchema(page: {
  name: string;
  description: string;
  url: string;
}): WebPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    ...page,
  };
}

export function createSoftwareApplicationSchema(offers: OfferSchema[]): ProductSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Moryflow',
    description:
      'AI agents that work with your knowledge, notes, and files. Local-first desktop app for macOS.',
    url: 'https://www.moryflow.com',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'macOS',
    offers,
  };
}

export function createArticleSchema(article: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    image: article.image ?? 'https://www.moryflow.com/og-image.svg',
    datePublished: article.datePublished,
    ...(article.dateModified && { dateModified: article.dateModified }),
    author: { '@type': 'Organization', name: 'Moryflow', url: 'https://www.moryflow.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Moryflow',
      url: 'https://www.moryflow.com',
      logo: { '@type': 'ImageObject', url: 'https://www.moryflow.com/logo.svg' },
    },
  };
}

export function createBreadcrumbSchema(items: { name: string; url: string }[]): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createFAQPageSchema(faqs: { question: string; answer: string }[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
