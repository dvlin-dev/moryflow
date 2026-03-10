/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 服务条款页面
 */

import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';

const content: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'Terms of Service',
    description: 'Moryflow Terms of Service - Understanding your rights and responsibilities.',
  },
  zh: {
    title: '服务条款',
    description: 'Moryflow 服务条款 — 了解你的权利和责任。',
  },
};

export const Route = createFileRoute('/{-$locale}/terms')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'terms',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: TermsPage,
});

function TermsPage() {
  const locale = useLocale();
  return (
    <main className="pt-24 pb-20">
      <article className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl prose prose-gray">
          {locale === 'zh' ? <ZhContent /> : <EnContent />}
        </div>
      </article>
    </main>
  );
}

function EnContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="lead">Last updated: January 2025</p>

      <h2>Agreement to Terms</h2>
      <p>
        By downloading or using Moryflow, you agree to be bound by these Terms of Service. If you do
        not agree, please do not use our service.
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
        You retain all rights to your content. We do not claim ownership of any notes, documents, or
        other materials you create using Moryflow.
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
        We strive to maintain service availability but do not guarantee uninterrupted access. Local
        features will always work offline.
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
        You may stop using Moryflow at any time. We may terminate or suspend access for violations
        of these terms.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these terms, please contact us at{' '}
        <a href="mailto:legal@moryflow.com">legal@moryflow.com</a>.
      </p>
    </>
  );
}

function ZhContent() {
  return (
    <>
      <h1>服务条款</h1>
      <p className="lead">最后更新：2025 年 1 月</p>

      <h2>条款同意</h2>
      <p>下载或使用 Moryflow 即表示你同意受本服务条款的约束。如果你不同意，请勿使用我们的服务。</p>

      <h2>服务使用</h2>
      <h3>许可</h3>
      <p>
        我们授予你一项非独占、不可转让的许可，允许你将 Moryflow 用于个人或商业用途，但须遵守本条款。
      </p>

      <h3>可接受使用</h3>
      <p>你同意不进行以下行为：</p>
      <ul>
        <li>对软件进行逆向工程或反编译</li>
        <li>将服务用于非法目的</li>
        <li>试图绕过安全措施</li>
        <li>共享你的账户凭据</li>
      </ul>

      <h2>你的内容</h2>
      <p>
        你保留对你内容的所有权利。我们不主张对你使用 Moryflow
        创建的任何笔记、文档或其他材料的所有权。
      </p>

      <h2>AI 功能</h2>
      <p>Moryflow 包含 AI 驱动的功能。尽管我们力求准确：</p>
      <ul>
        <li>AI 回复不一定始终准确</li>
        <li>你应独立验证重要信息</li>
        <li>AI 功能按"现状"提供</li>
      </ul>

      <h2>服务可用性</h2>
      <p>我们努力保持服务可用，但不保证服务不间断。本地功能始终支持离线使用。</p>

      <h2>责任限制</h2>
      <p>
        在法律允许的最大范围内，Moryflow
        不对因你使用本服务而产生的任何间接、附带或后果性损害承担责任。
      </p>

      <h2>条款变更</h2>
      <p>我们可能会不时更新本条款。在条款变更后继续使用本服务即视为接受新条款。</p>

      <h2>终止</h2>
      <p>你可以随时停止使用 Moryflow。如果违反本条款，我们可能会终止或暂停你的访问权限。</p>

      <h2>联系方式</h2>
      <p>
        如对本条款有疑问，请通过 <a href="mailto:legal@moryflow.com">legal@moryflow.com</a>{' '}
        联系我们。
      </p>
    </>
  );
}
