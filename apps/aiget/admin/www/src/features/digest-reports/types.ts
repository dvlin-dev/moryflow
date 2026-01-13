/**
 * Digest Reports Types
 *
 * [DEFINES]: Report types for admin
 * [POS]: Type definitions for report management
 */

export type ReportStatus = 'PENDING' | 'RESOLVED_VALID' | 'RESOLVED_INVALID' | 'DISMISSED';
export type ReportReason = 'SPAM' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'MISLEADING' | 'OTHER';

export interface Report {
  id: string;
  topicId: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolveNote: string | null;
  topic?: {
    id: string;
    slug: string;
    title: string;
  };
}

export interface ReportQuery {
  cursor?: string;
  limit?: number;
  status?: ReportStatus;
  topicId?: string;
}

export interface ResolveReportInput {
  status: Exclude<ReportStatus, 'PENDING'>;
  resolveNote?: string;
  pauseTopic?: boolean;
}

export interface ReportListResponse {
  items: Report[];
  nextCursor: string | null;
  pendingCount: number;
}
