/**
 * Digest Topics Page
 *
 * [INPUT]: User's published topics
 * [OUTPUT]: List of topics with management actions
 * [POS]: /digest/topics route
 */

import { TopicList } from '@/features/digest';

export default function DigestTopicsPage() {
  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">My Topics</h1>
        <p className="text-muted-foreground">
          Manage your published topics that others can subscribe to
        </p>
      </div>

      <TopicList />
    </div>
  );
}
