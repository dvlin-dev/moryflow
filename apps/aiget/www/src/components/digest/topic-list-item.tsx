/**
 * Topic List Item Component
 *
 * [PROPS]: DigestTopicSummary
 * [POS]: Displays a single topic in the topics listing page
 */

import { Link } from '@tanstack/react-router';
import { Calendar01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { DigestTopicSummary } from '@/lib/digest-api';

interface TopicListItemProps {
  topic: DigestTopicSummary;
}

export function TopicListItem({ topic }: TopicListItemProps) {
  return (
    <Link
      to="/topics/$slug"
      params={{ slug: topic.slug }}
      className="group block rounded-lg border border-neutral-200 bg-white p-6 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-neutral-700">
            {topic.title}
          </h3>
          {topic.description && (
            <p className="line-clamp-2 text-sm text-neutral-600">{topic.description}</p>
          )}
          <div className="flex items-center gap-4 pt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={UserMultipleIcon} className="h-3.5 w-3.5" />
              {topic.subscriberCount} subscribers
            </span>
            {topic.lastEditionAt && (
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
                Last edition{' '}
                {new Date(topic.lastEditionAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            Subscribe
          </span>
        </div>
      </div>
    </Link>
  );
}
