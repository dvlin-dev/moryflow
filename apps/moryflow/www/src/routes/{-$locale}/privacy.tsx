/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 隐私政策页面
 */

import { createFileRoute } from '@tanstack/react-router';
import { getPageMeta } from '@/lib/seo';
import { resolveLocale, type Locale } from '@/lib/i18n';
import { useLocale } from '@/routes/{-$locale}/route';

const LEGAL_LAST_UPDATED = { en: 'March 2026', zh: '2026 年 3 月' } as const;

const content: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'Privacy Policy',
    description:
      'Moryflow Privacy Policy - Learn how we protect your data and respect your privacy.',
  },
  zh: {
    title: '隐私政策',
    description: 'Moryflow 隐私政策 — 了解我们如何保护你的数据和尊重你的隐私。',
  },
};

export const Route = createFileRoute('/{-$locale}/privacy')({
  head: ({ params }) => {
    const c = content[resolveLocale(params.locale)];
    return getPageMeta({
      pageId: 'privacy',
      locale: params.locale,
      title: c.title,
      description: c.description,
    });
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  const locale = useLocale();
  return (
    <main className="pt-24 pb-20">
      <article className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl prose prose-gray">
          {locale === 'zh' ? (
            <ZhContent lastUpdated={LEGAL_LAST_UPDATED.zh} />
          ) : (
            <EnContent lastUpdated={LEGAL_LAST_UPDATED.en} />
          )}
        </div>
      </article>
    </main>
  );
}

function EnContent({ lastUpdated }: { lastUpdated: string }) {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: {lastUpdated}</p>

      <h2>Our Commitment</h2>
      <p>
        At Moryflow, privacy is not just a feature - it's our foundation. We believe your data
        belongs to you, and we've built our entire product around this principle.
      </p>

      <h2>Data Storage</h2>
      <h3>Local-First Architecture</h3>
      <p>By default, all your data is stored locally on your device. This includes:</p>
      <ul>
        <li>Notes and documents</li>
        <li>AI conversation history</li>
        <li>Personal preferences and settings</li>
        <li>Memory and context data</li>
      </ul>

      <h3>Optional Cloud Sync</h3>
      <p>
        If you choose to enable cloud sync, your data will be encrypted end-to-end before being
        transmitted to our servers. We cannot read your data - only you have the keys.
      </p>

      <h2>Data We Collect</h2>
      <h3>Usage Analytics (Optional)</h3>
      <p>With your consent, we may collect anonymous usage analytics to improve the product:</p>
      <ul>
        <li>Feature usage frequency</li>
        <li>Error reports</li>
        <li>Performance metrics</li>
      </ul>
      <p>This data is completely anonymous and cannot be traced back to you.</p>

      <h3>Account Information</h3>
      <p>If you create an account for cloud sync, we store:</p>
      <ul>
        <li>Email address</li>
        <li>Encrypted authentication tokens</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        When you use web search features, queries are sent to search providers. We do not store
        these queries or associate them with your identity.
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
    </>
  );
}

function ZhContent({ lastUpdated }: { lastUpdated: string }) {
  return (
    <>
      <h1>隐私政策</h1>
      <p className="lead">最后更新：{lastUpdated}</p>

      <h2>我们的承诺</h2>
      <p>
        在
        Moryflow，隐私不仅仅是一项功能，更是我们的基石。我们相信你的数据属于你，并围绕这一原则构建了整个产品。
      </p>

      <h2>数据存储</h2>
      <h3>本地优先架构</h3>
      <p>默认情况下，你的所有数据均存储在本地设备上，包括：</p>
      <ul>
        <li>笔记和文档</li>
        <li>AI 对话记录</li>
        <li>个人偏好和设置</li>
        <li>记忆和上下文数据</li>
      </ul>

      <h3>可选云端同步</h3>
      <p>
        如果你选择开启云端同步，数据在传输到我们的服务器之前会进行端到端加密。我们无法读取你的数据——只有你持有密钥。
      </p>

      <h2>我们收集的数据</h2>
      <h3>使用分析（可选）</h3>
      <p>在你同意的前提下，我们可能会收集匿名使用分析数据以改进产品：</p>
      <ul>
        <li>功能使用频率</li>
        <li>错误报告</li>
        <li>性能指标</li>
      </ul>
      <p>这些数据完全匿名，无法追溯到你个人。</p>

      <h3>账户信息</h3>
      <p>如果你为云端同步创建了账户，我们会存储：</p>
      <ul>
        <li>电子邮箱地址</li>
        <li>加密的身份验证令牌</li>
      </ul>

      <h2>第三方服务</h2>
      <p>
        当你使用网页搜索功能时，查询会发送到搜索服务提供商。我们不会存储这些查询，也不会将它们与你的身份关联。
      </p>

      <h2>你的权利</h2>
      <p>你有权：</p>
      <ul>
        <li>随时访问你的数据</li>
        <li>以标准格式导出你的数据</li>
        <li>完全删除你的数据</li>
        <li>退出使用分析数据收集</li>
      </ul>

      <h2>联系方式</h2>
      <p>
        如有隐私相关问题，请通过 <a href="mailto:privacy@moryflow.com">privacy@moryflow.com</a>{' '}
        联系我们。
      </p>
    </>
  );
}
