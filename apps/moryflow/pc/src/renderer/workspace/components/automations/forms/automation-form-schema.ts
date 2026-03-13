import { z } from 'zod/v3';
import type { AutomationEndpoint, AutomationJob } from '@shared/ipc';
import type { AutomationThinkingSelection } from '@moryflow/automations-core';

export const DEFAULT_AUTOMATION_NAME = 'New automation';
export const DEFAULT_CONTEXT_DEPTH = 6;

export const AUTOMATION_PERMISSION_PRESET = {
  approvalMode: 'unattended' as const,
  toolPolicy: {
    allow: [{ tool: 'Read' as const }, { tool: 'Edit' as const }],
  },
  networkPolicy: {
    mode: 'deny' as const,
  },
  fileSystemPolicy: {
    mode: 'vault_only' as const,
  },
  requiresExplicitConfirmation: true,
};

export const automationFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    enabled: z.boolean(),
    scheduleKind: z.enum(['at', 'every']),
    runAt: z.string().trim().optional(),
    intervalHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 14)
      .default(24),
    message: z.string().trim().min(1, 'Prompt is required.'),
    modelId: z.string().trim().optional(),
    thinkingMode: z.enum(['off', 'level']).default('off'),
    thinkingLevel: z.string().trim().optional(),
    deliveryMode: z.enum(['none', 'push']).default('push'),
    endpointId: z.string().trim().optional(),
    confirmUnattendedExecution: z.boolean().refine((value) => value, {
      message: 'Please confirm unattended execution permissions.',
    }),
  })
  .superRefine((values, ctx) => {
    if (values.scheduleKind === 'at') {
      if (!values.runAt?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['runAt'],
          message: 'Run time is required for one-time automations.',
        });
      } else if (Number.isNaN(Date.parse(values.runAt))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['runAt'],
          message: 'Run time must be a valid date time.',
        });
      }
    }

    if (values.thinkingMode === 'level' && !values.thinkingLevel?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thinkingLevel'],
        message: 'Choose a thinking level.',
      });
    }

    if (values.deliveryMode === 'push' && !values.endpointId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endpointId'],
        message: 'Choose a verified endpoint.',
      });
    }
  });

export type AutomationFormValues = z.infer<typeof automationFormSchema>;

const toDatetimeLocal = (timestampMs: number | undefined): string => {
  if (!timestampMs) {
    return '';
  }
  const date = new Date(timestampMs);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const normalizeThinking = (
  thinking: AutomationThinkingSelection | undefined
): Pick<AutomationFormValues, 'thinkingMode' | 'thinkingLevel'> => {
  if (!thinking || thinking.mode === 'off') {
    return {
      thinkingMode: 'off',
      thinkingLevel: '',
    };
  }
  return {
    thinkingMode: 'level',
    thinkingLevel: thinking.level,
  };
};

const resolveDefaultEndpointId = (input: {
  endpoints: AutomationEndpoint[];
  defaultEndpointId?: string | null;
}): string | undefined => {
  const verifiedEndpoints = input.endpoints.filter((endpoint) => Boolean(endpoint.verifiedAt));
  if (
    input.defaultEndpointId &&
    verifiedEndpoints.some((item) => item.id === input.defaultEndpointId)
  ) {
    return input.defaultEndpointId;
  }
  if (verifiedEndpoints.length === 1) {
    return verifiedEndpoints[0]?.id;
  }
  return undefined;
};

export const createAutomationFormDefaults = (input: {
  endpoints: AutomationEndpoint[];
  defaultEndpointId?: string | null;
  initialMessage?: string;
  initialName?: string;
}): AutomationFormValues => ({
  name: input.initialName?.trim() || DEFAULT_AUTOMATION_NAME,
  enabled: true,
  scheduleKind: 'every',
  runAt: '',
  intervalHours: 24,
  message: input.initialMessage?.trim() || '',
  modelId: '',
  thinkingMode: 'off',
  thinkingLevel: '',
  deliveryMode: 'push',
  endpointId: resolveDefaultEndpointId(input),
  confirmUnattendedExecution: false,
});

export const toAutomationFormValues = (job: AutomationJob): AutomationFormValues => ({
  name: job.name,
  enabled: job.enabled,
  scheduleKind: job.schedule.kind,
  runAt: job.schedule.kind === 'at' ? toDatetimeLocal(job.schedule.runAt) : '',
  intervalHours:
    job.schedule.kind === 'every'
      ? Math.max(1, Math.round(job.schedule.intervalMs / 3_600_000))
      : 24,
  message: job.payload.message,
  modelId: job.payload.modelId ?? '',
  ...normalizeThinking(job.payload.thinking),
  deliveryMode: job.delivery.mode,
  endpointId: job.delivery.mode === 'push' ? job.delivery.endpointId : undefined,
  confirmUnattendedExecution: true,
});
