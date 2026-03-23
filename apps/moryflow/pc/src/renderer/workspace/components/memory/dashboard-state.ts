import type { MemoryOverview } from '@shared/ipc';
import type { KnowledgeSummaryState } from './knowledge-status';

export function shouldShowMemoryEmptyDashboard(input: {
  isDisabled: boolean;
  overview: MemoryOverview | null;
  overviewLoading: boolean;
  personalFactsCount: number;
  graphEntityCount: number;
  knowledgeState: KnowledgeSummaryState;
}): boolean {
  if (input.isDisabled || input.overviewLoading) {
    return false;
  }

  if (input.overview && (input.overview.bootstrap.pending || input.overview.projection.pending)) {
    return false;
  }

  if (input.knowledgeState !== 'READY') {
    return false;
  }

  if (input.personalFactsCount > 0 || input.graphEntityCount > 0) {
    return false;
  }

  if (!input.overview) {
    return true;
  }

  return (
    input.overview.facts.manualCount === 0 &&
    input.overview.facts.derivedCount === 0 &&
    input.overview.graph.entityCount === 0
  );
}
