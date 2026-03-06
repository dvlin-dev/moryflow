/**
 * Digest Reports Constants
 *
 * [DEFINES]: status/reason mappings + report public URL
 * [USED_BY]: digest reports page/components/forms
 * [POS]: Digest reports feature constants
 */

import type { ReportReason, ReportStatus } from './types';

export const DIGEST_REPORT_PUBLIC_BASE_URL = 'https://anyhunt.app';

export const REPORT_STATUS_OPTIONS: ReportStatus[] = [
  'PENDING',
  'RESOLVED_VALID',
  'RESOLVED_INVALID',
  'DISMISSED',
];

export const reportReasonLabels: Record<ReportReason, string> = {
  SPAM: 'Spam',
  COPYRIGHT: 'Copyright',
  INAPPROPRIATE: 'Inappropriate',
  MISLEADING: 'Misleading',
  OTHER: 'Other',
};

export const reportStatusConfig: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  PENDING: { label: 'Pending', variant: 'destructive' },
  RESOLVED_VALID: { label: 'Valid', variant: 'default' },
  RESOLVED_INVALID: { label: 'Invalid', variant: 'secondary' },
  DISMISSED: { label: 'Dismissed', variant: 'outline' },
};
