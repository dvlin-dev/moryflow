/**
 * [PROPS]: { data } - JSON-LD 结构化数据
 * [EMITS]: 无
 * [POS]: SEO JSON-LD 注入组件
 */

interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

interface ProductSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
  };
}

type JsonLdData = OrganizationSchema | ProductSchema;

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export const organizationSchema: OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Moryflow',
  url: 'https://www.moryflow.com',
  logo: 'https://www.moryflow.com/logo.svg',
  sameAs: ['https://twitter.com/moryflow', 'https://github.com/moryflow'],
};

export const productSchema: ProductSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Moryflow',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'macOS, Windows, iOS, Android',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};
