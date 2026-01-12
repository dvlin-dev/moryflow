/**
 * [PROPS]: { data } - JSON-LD structured data object
 * [EMITS]: None
 * [POS]: SEO JSON-LD component, injects structured data into page head
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

// Organization structured data
export const organizationSchema: OrganizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Moryflow',
  url: 'https://moryflow.com',
  logo: 'https://moryflow.com/logo.png',
  sameAs: ['https://twitter.com/moryflow', 'https://github.com/moryflow'],
};

// Product structured data
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
