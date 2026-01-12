/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 服务条款页面
 */

import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: generateMeta({
      title: 'Terms of Service',
      description: 'Moryflow Terms of Service - Understanding your rights and responsibilities.',
      path: '/terms',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/terms` }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="pt-24 pb-20">
      <article className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl prose prose-gray prose-headings:font-serif">
          <h1>Terms of Service</h1>
          <p className="lead">Last updated: January 2025</p>

          <h2>Agreement to Terms</h2>
          <p>
            By downloading or using Moryflow, you agree to be bound by these Terms of Service. If
            you do not agree, please do not use our service.
          </p>

          <h2>Use of Service</h2>
          <h3>License</h3>
          <p>
            We grant you a non-exclusive, non-transferable license to use Moryflow for personal or
            commercial purposes, subject to these terms.
          </p>

          <h3>Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul>
            <li>Reverse engineer or decompile the software</li>
            <li>Use the service for illegal purposes</li>
            <li>Attempt to bypass security measures</li>
            <li>Share your account credentials</li>
          </ul>

          <h2>Your Content</h2>
          <p>
            You retain all rights to your content. We do not claim ownership of any notes,
            documents, or other materials you create using Moryflow.
          </p>

          <h2>AI Features</h2>
          <p>Moryflow includes AI-powered features. While we strive for accuracy:</p>
          <ul>
            <li>AI responses may not always be accurate</li>
            <li>You should verify important information independently</li>
            <li>AI features are provided "as is"</li>
          </ul>

          <h2>Service Availability</h2>
          <p>
            We strive to maintain service availability but do not guarantee uninterrupted access.
            Local features will always work offline.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Moryflow shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the service.
          </p>

          <h2>Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the service after changes
            constitutes acceptance of the new terms.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using Moryflow at any time. We may terminate or suspend access for
            violations of these terms.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, please contact us at{' '}
            <a href="mailto:legal@moryflow.com">legal@moryflow.com</a>.
          </p>
        </div>
      </article>
    </main>
  );
}
