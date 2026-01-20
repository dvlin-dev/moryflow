/**
 * Agent DTO - Zod Schemas
 *
 * [DEFINES]: L3 Agent API 请求/响应/Param Schema（输出格式收紧；model 由 API Key 策略决定）
 * [USED_BY]: agent.controller.ts, agent.service.ts
 * [POS]: Zod schemas + 推断类型（单一数据源）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

const FIELD_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_OUTPUT_PROPERTIES = 50;
const MAX_SCHEMA_BYTES = 16 * 1024;
const MAX_SCHEMA_DEPTH = 3;

const FieldNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(FIELD_NAME_REGEX, 'Invalid field name');

type JsonSchemaProperty = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: Array<string | number | boolean>;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

const JsonSchemaPropertySchema: z.ZodType<JsonSchemaProperty> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        'string',
        'number',
        'integer',
        'boolean',
        'array',
        'object',
      ]),
      description: z.string().min(1).max(500).optional(),
      enum: z
        .array(z.union([z.string(), z.number(), z.boolean()]))
        .min(1)
        .max(50)
        .optional(),
      items: z.any().optional(),
      properties: z.any().optional(),
      required: z.array(FieldNameSchema).max(MAX_OUTPUT_PROPERTIES).optional(),
      additionalProperties: z.boolean().optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.enum) {
        if (value.type === 'string') {
          if (value.enum.some((item) => typeof item !== 'string')) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'enum values must be strings when type is string',
              path: ['enum'],
            });
          }
        } else if (value.type === 'boolean') {
          if (value.enum.some((item) => typeof item !== 'boolean')) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'enum values must be booleans when type is boolean',
              path: ['enum'],
            });
          }
        } else if (value.type === 'number') {
          if (value.enum.some((item) => typeof item !== 'number')) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'enum values must be numbers when type is number',
              path: ['enum'],
            });
          }
        } else if (value.type === 'integer') {
          if (
            value.enum.some(
              (item) => typeof item !== 'number' || !Number.isInteger(item),
            )
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'enum values must be integers when type is integer',
              path: ['enum'],
            });
          }
        } else {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'enum is only allowed for scalar types',
            path: ['enum'],
          });
        }
      }

      if (value.type === 'array') {
        const items = JsonSchemaPropertySchema.safeParse(value.items);
        if (!items.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Array schema must include valid items',
            path: ['items'],
          });
        }
      } else if (value.items !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'items is only allowed for array type',
          path: ['items'],
        });
      }

      if (value.type === 'object') {
        const propertiesResult = z
          .record(FieldNameSchema, JsonSchemaPropertySchema)
          .safeParse(value.properties ?? {});
        if (!propertiesResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Object schema must include valid properties',
            path: ['properties'],
          });
          return;
        }

        const propertyKeys = Object.keys(propertiesResult.data);
        if (propertyKeys.length > MAX_OUTPUT_PROPERTIES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Too many properties (max ${MAX_OUTPUT_PROPERTIES})`,
            path: ['properties'],
          });
        }

        const required = value.required ?? [];
        for (const name of required) {
          if (!propertyKeys.includes(name)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'required must be a subset of properties',
              path: ['required'],
            });
            break;
          }
        }
      } else {
        if (value.properties !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'properties is only allowed for object type',
            path: ['properties'],
          });
        }
        if (value.required !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'required is only allowed for object type',
            path: ['required'],
          });
        }
        if (value.additionalProperties !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'additionalProperties is only allowed for object type',
            path: ['additionalProperties'],
          });
        }
      }
    }),
);

type AgentOutputText = { type: 'text' };
type AgentOutputJsonSchema = {
  type: 'json_schema';
  name?: string;
  strict?: boolean;
  schema: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export type AgentOutput = AgentOutputText | AgentOutputJsonSchema;

const AgentOutputSchema: z.ZodType<AgentOutput> = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('text') }).strict(),
    z
      .object({
        type: z.literal('json_schema'),
        name: z.string().min(1).max(64).optional(),
        strict: z.boolean().optional(),
        schema: z
          .object({
            type: z.literal('object'),
            properties: z.record(FieldNameSchema, JsonSchemaPropertySchema),
            required: z
              .array(FieldNameSchema)
              .max(MAX_OUTPUT_PROPERTIES)
              .optional(),
            additionalProperties: z.boolean().optional(),
          })
          .strict()
          .superRefine((schema, ctx) => {
            const propertyKeys = Object.keys(schema.properties);
            if (propertyKeys.length > MAX_OUTPUT_PROPERTIES) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Too many properties (max ${MAX_OUTPUT_PROPERTIES})`,
                path: ['properties'],
              });
              return;
            }

            const required = schema.required ?? [];
            for (const name of required) {
              if (!propertyKeys.includes(name)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'required must be a subset of properties',
                  path: ['required'],
                });
                break;
              }
            }

            const jsonBytes = Buffer.byteLength(JSON.stringify(schema), 'utf8');
            if (jsonBytes > MAX_SCHEMA_BYTES) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Schema is too large (max ${MAX_SCHEMA_BYTES} bytes)`,
                path: [],
              });
            }

            const maxFieldDepth = getJsonSchemaFieldsMaxDepth(
              schema.properties,
            );
            if (maxFieldDepth > MAX_SCHEMA_DEPTH) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Schema is too deep (max field depth ${MAX_SCHEMA_DEPTH})`,
                path: [],
              });
            }
          }),
      })
      .strict(),
  ])
  .default({ type: 'text' });

function getJsonSchemaDepth(schema: JsonSchemaProperty): number {
  if (schema.type === 'array') {
    return 1 + getJsonSchemaDepth(schema.items ?? { type: 'string' });
  }

  if (schema.type !== 'object') {
    return 1;
  }

  const properties = schema.properties ?? {};
  let maxChildDepth = 0;
  for (const property of Object.values(properties)) {
    maxChildDepth = Math.max(maxChildDepth, getJsonSchemaDepth(property));
  }

  return 1 + maxChildDepth;
}

function getJsonSchemaFieldsMaxDepth(
  properties: Record<string, JsonSchemaProperty>,
): number {
  let maxDepth = 0;
  for (const property of Object.values(properties)) {
    maxDepth = Math.max(maxDepth, getJsonSchemaDepth(property));
  }
  return maxDepth;
}

export const AgentTaskIdSchema = z
  .string()
  .regex(/^at_[a-z0-9]+_[a-z0-9]+$/, 'Invalid task ID');

export const AgentTaskIdParamSchema = z.object({
  id: AgentTaskIdSchema,
});
export type AgentTaskIdParamDto = z.infer<typeof AgentTaskIdParamSchema>;

export const CreateAgentTaskSchema = z.object({
  prompt: z.string().min(1).max(10000),
  urls: z.array(z.string().url()).max(10).optional(),
  output: AgentOutputSchema,
  maxCredits: z.number().int().positive().optional(),
  stream: z.boolean().default(true),
});

export type CreateAgentTaskInput = z.infer<typeof CreateAgentTaskSchema>;

export type AgentTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTaskInfo {
  id: string;
  status: AgentTaskStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AgentTaskResult {
  id: string;
  status: AgentTaskStatus;
  data?: unknown;
  creditsUsed?: number;
  error?: string;
  progress?: AgentTaskProgress;
}

export interface AgentTaskProgress {
  creditsUsed: number;
  toolCallCount: number;
  elapsedMs: number;
}

export interface AgentEventStarted {
  type: 'started';
  id: string;
  expiresAt: string;
}

export interface AgentEventThinking {
  type: 'thinking';
  content: string;
}

export interface AgentEventToolCall {
  type: 'tool_call';
  callId: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface AgentEventToolResult {
  type: 'tool_result';
  callId: string;
  tool: string;
  result: unknown;
  error?: string;
}

export interface AgentEventProgress {
  type: 'progress';
  message: string;
  step: number;
  totalSteps?: number;
}

export interface AgentEventComplete {
  type: 'complete';
  data: unknown;
  creditsUsed: number;
}

export interface AgentEventFailed {
  type: 'failed';
  error: string;
  creditsUsed?: number;
  progress?: AgentTaskProgress;
}

export type AgentStreamEvent =
  | AgentEventStarted
  | AgentEventThinking
  | AgentEventToolCall
  | AgentEventToolResult
  | AgentEventProgress
  | AgentEventComplete
  | AgentEventFailed;
