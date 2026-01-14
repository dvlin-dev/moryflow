/**
 * Homepage
 *
 * [INPUT]: None
 * [OUTPUT]: Digest-focused homepage with public topics
 * [POS]: aiget.dev homepage - C 端用户入口
 */

import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Header, Footer } from '@/components/layout';
import { HomeHero, TopicsSection, HowItWorks, HomeCTA } from '@/components/home';
import {
  getFeaturedTopics,
  getTrendingTopics,
  getLatestTopics,
  type DigestTopicSummary,
} from '@/lib/digest-api';
import { usePublicEnv } from './__root';

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Aiget - AI-Powered Content Digest' },
      {
        name: 'description',
        content:
          'Subscribe to AI-curated topics and get intelligent summaries of what matters. Stay informed without information overload.',
      },
      { property: 'og:title', content: 'Aiget - AI-Powered Content Digest' },
      {
        property: 'og:description',
        content: 'Subscribe to AI-curated topics and get intelligent summaries of what matters.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://aiget.dev' }],
  }),
});

function HomePage() {
  const env = usePublicEnv();
  const [featuredTopics, setFeaturedTopics] = useState<DigestTopicSummary[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<DigestTopicSummary[]>([]);
  const [latestTopics, setLatestTopics] = useState<DigestTopicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTopics();
  }, [env.apiUrl]);

  async function loadTopics() {
    setIsLoading(true);
    try {
      // 并行加载三类 Topics
      const [featured, trending, latest] = await Promise.all([
        getFeaturedTopics(env.apiUrl, 6).catch(() => []),
        getTrendingTopics(env.apiUrl, 6).catch(() => []),
        getLatestTopics(env.apiUrl, 6).catch(() => []),
      ]);

      setFeaturedTopics(featured);
      setTrendingTopics(trending);
      setLatestTopics(latest);
    } finally {
      setIsLoading(false);
    }
  }

  // 是否显示 Featured 区域（需要有精选内容）
  const showFeatured = isLoading || featuredTopics.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HomeHero />

        {/* Featured Topics - 仅当有精选内容时显示 */}
        {showFeatured && (
          <TopicsSection
            title="Featured Topics"
            subtitle="Hand-picked topics curated by our team"
            topics={featuredTopics}
            isLoading={isLoading}
            showViewAll={false}
            columns={3}
          />
        )}

        {/* Trending Topics */}
        <TopicsSection
          title="Trending Topics"
          subtitle="Popular topics the community is following"
          topics={trendingTopics}
          isLoading={isLoading}
          viewAllHref="/topics"
          columns={3}
        />

        {/* How It Works */}
        <HowItWorks />

        {/* Latest Topics */}
        <TopicsSection
          title="Latest Topics"
          subtitle="Recently created by the community"
          topics={latestTopics}
          isLoading={isLoading}
          viewAllHref="/topics"
          columns={3}
        />

        {/* CTA */}
        <HomeCTA />
      </main>
      <Footer />
    </div>
  );
}
