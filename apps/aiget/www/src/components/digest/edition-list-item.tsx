/**
 * Edition List Item Component
 *
 * [PROPS]: DigestEditionSummary, topicSlug
 * [POS]: Displays a single edition in the topic detail page
 */

import { Link } from '@tanstack/react-router';
import { Calendar01Icon, News01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { DigestEditionSummary } from '@/lib/digest-api';

interface EditionListItemProps {
  edition: DigestEditionSummary;
  topicSlug: string;
}

export function EditionListItem({ edition, topicSlug }: EditionListItemProps) {
  return (
    <Link
      to="/topics/$slug/editions/$editionId"
      params={{ slug: topicSlug, editionId: edition.id }}
      className="group block rounded-lg border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-medium text-neutral-900 group-hover:text-neutral-700">
            Edition #{edition.editionNumber}
          </h4>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
              {new Date(edition.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <HugeiconsIcon icon={News01Icon} className="h-3.5 w-3.5" />
              {edition.itemCount} items
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <span className="text-sm text-neutral-400 group-hover:text-neutral-600">View →</span>
        </div>
      </div>
      {edition.narrativeMarkdown && (
        <p className="mt-3 line-clamp-2 text-sm text-neutral-600">
          {edition.narrativeMarkdown.slice(0, 200)}...
        </p>
      )}
    </Link>
  );
}
