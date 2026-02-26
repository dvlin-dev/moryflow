/**
 * [PROPS]: FlowRunnerStepListProps
 * [EMITS]: n/a
 * [POS]: Flow Runner 步骤状态展示区
 */

import { Badge } from '@moryflow/ui';
import { getStepBadgeVariant, statusLabel } from './flow-runner-helpers';
import type { FlowStep } from './flow-runner-types';

type FlowRunnerStepListProps = {
  steps: FlowStep[];
};

export function FlowRunnerStepList({ steps }: FlowRunnerStepListProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center justify-between rounded-lg border border-border-muted px-3 py-2 text-sm"
        >
          <span>{step.label}</span>
          <Badge variant={getStepBadgeVariant(step.status)} className="text-xs">
            {statusLabel[step.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
