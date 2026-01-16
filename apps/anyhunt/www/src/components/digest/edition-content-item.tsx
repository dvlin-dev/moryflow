/**
 * Edition Content Item Component
 *
 * [PROPS]: DigestEditionItem
 * [POS]: Displays a single content item within an edition
 */

import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { DigestEditionItem } from '@/lib/digest-api';

interface EditionContentItemProps {
  item: DigestEditionItem;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700';
  if (score >= 60) return 'bg-blue-100 text-blue-700';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700';
  return 'bg-neutral-100 text-neutral-600';
}

export function EditionContentItem({ item }: EditionContentItemProps) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 transition-all hover:border-neutral-300">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
          {item.rank}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-neutral-900 leading-snug">{item.titleSnapshot}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getScoreColor(item.scoreOverall)}`}
            >
              {item.scoreOverall}
            </span>
          </div>

          {item.aiSummarySnapshot && (
            <p className="text-sm text-neutral-600 leading-relaxed">{item.aiSummarySnapshot}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            {item.favicon && (
              <img src={item.favicon} alt="" className="h-4 w-4 rounded" loading="lazy" />
            )}
            {item.siteName && <span className="text-xs text-neutral-500">{item.siteName}</span>}
            <a
              href={item.urlSnapshot}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              <HugeiconsIcon icon={LinkSquare01Icon} className="h-3 w-3" />
              Read original
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
