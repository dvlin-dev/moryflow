/**
 * Digest Topics Constants
 *
 * [DEFINES]: UI options + badge mappings + public topic URL
 * [USED_BY]: digest topics page/components
 * [POS]: Digest topics feature constants
 */

import type { TopicStatus, TopicVisibility } from './types';

export const DIGEST_TOPIC_PUBLIC_BASE_URL = 'https://anyhunt.app';

export const TOPIC_VISIBILITY_OPTIONS: TopicVisibility[] = ['PUBLIC', 'PRIVATE', 'UNLISTED'];

export const TOPIC_STATUS_OPTIONS: TopicStatus[] = [
  'ACTIVE',
  'PAUSED_INSUFFICIENT_CREDITS',
  'PAUSED_BY_ADMIN',
];

export const topicVisibilityConfig: Record<
  TopicVisibility,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  PUBLIC: { label: 'Public', variant: 'default' },
  PRIVATE: { label: 'Private', variant: 'secondary' },
  UNLISTED: { label: 'Unlisted', variant: 'outline' },
};

export const topicStatusConfig: Record<
  TopicStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  PAUSED_INSUFFICIENT_CREDITS: { label: 'No Credits', variant: 'destructive' },
  PAUSED_BY_ADMIN: { label: 'Paused', variant: 'secondary' },
};
