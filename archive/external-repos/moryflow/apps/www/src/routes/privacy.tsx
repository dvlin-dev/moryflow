/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 隐私政策页面
 */

import { createFileRoute } from '@tanstack/react-router'
import { generateMeta, siteConfig } from '@/lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: generateMeta({
      title: 'Privacy Policy',
      description: 'Moryflow Privacy Policy - Learn how we protect your data and respect your privacy.',
      path: '/privacy',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/privacy` }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="pt-24 pb-20">
      <article className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl prose prose-gray prose-headings:font-serif">
          <h1>Privacy Policy</h1>
          <p className="lead">
            Last updated: January 2025
          </p>

          <h2>Our Commitment</h2>
          <p>
            At Moryflow, privacy is not just a feature - it's our foundation. We believe your data
            belongs to you, and we've built our entire product around this principle.
          </p>

          <h2>Data Storage</h2>
          <h3>Local-First Architecture</h3>
          <p>
            By default, all your data is stored locally on your device. This includes:
          </p>
          <ul>
            <li>Notes and documents</li>
            <li>AI conversation history</li>
            <li>Personal preferences and settings</li>
            <li>Memory and context data</li>
          </ul>

          <h3>Optional Cloud Sync</h3>
          <p>
            If you choose to enable cloud sync, your data will be encrypted end-to-end before
            being transmitted to our servers. We cannot read your data - only you have the keys.
          </p>

          <h2>Data We Collect</h2>
          <h3>Usage Analytics (Optional)</h3>
          <p>
            With your consent, we may collect anonymous usage analytics to improve the product:
          </p>
          <ul>
            <li>Feature usage frequency</li>
            <li>Error reports</li>
            <li>Performance metrics</li>
          </ul>
          <p>
            This data is completely anonymous and cannot be traced back to you.
          </p>

          <h3>Account Information</h3>
          <p>
            If you create an account for cloud sync, we store:
          </p>
          <ul>
            <li>Email address</li>
            <li>Encrypted authentication tokens</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>
            When you use web search features, queries are sent to search providers. We do not
            store these queries or associate them with your identity.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your data at any time</li>
            <li>Export your data in standard formats</li>
            <li>Delete your data completely</li>
            <li>Opt out of analytics collection</li>
          </ul>

          <h2>Contact</h2>
          <p>
            For privacy-related questions, please contact us at{' '}
            <a href="mailto:privacy@moryflow.com">privacy@moryflow.com</a>.
          </p>
        </div>
      </article>
    </main>
  )
}
